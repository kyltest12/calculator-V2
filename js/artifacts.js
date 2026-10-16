(function () {
    "use strict";

    const SC = window.StalkerCalc;

    SC.initArtifacts = function (artifactsData) {
        const artifactPriceVersion = artifactsData.priceVersion || '2026-04-24';
        const savedArtifactPriceVersion = localStorage.getItem('artifactPricesVersion');

        if (savedArtifactPriceVersion !== artifactPriceVersion) {
            localStorage.removeItem('artifactPrices');
            localStorage.removeItem('artifactPricesByName');
            localStorage.setItem('artifactPricesVersion', artifactPriceVersion);
        }

        let artifacts = artifactsData.artifacts.map(item => ({
            name: item.name,
            price: item.price,
            iigPrice: Number.isFinite(item.iigPrice) ? item.iigPrice : 0,
            properties: item.properties || {},
            image: ''
        }));

        // Цены хранятся по названию (раньше — массивом по индексу, из-за чего они
        // «съезжали» при любой перестановке артефактов в JSON). ИИГ-цены тоже сохраняются.
        try {
            const savedByName = localStorage.getItem('artifactPricesByName');
            if (savedByName) {
                const prices = JSON.parse(savedByName);
                if (prices && typeof prices === 'object' && !Array.isArray(prices)) {
                    artifacts.forEach(artifact => {
                        const saved = prices[artifact.name];
                        if (!saved) return;
                        if (Number.isFinite(saved.price) && saved.price >= 0) artifact.price = saved.price;
                        if (Number.isFinite(saved.iig) && saved.iig >= 0) artifact.iigPrice = saved.iig;
                    });
                }
            } else {
                const legacy = localStorage.getItem('artifactPrices');
                if (legacy) {
                    const prices = JSON.parse(legacy);
                    if (Array.isArray(prices)) {
                        artifacts.forEach((artifact, index) => {
                            const p = prices[index];
                            if (Number.isFinite(p) && p >= 0) artifact.price = p;
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Не удалось загрузить сохраненные цены:', error);
            localStorage.removeItem('artifactPricesByName');
            localStorage.removeItem('artifactPrices');
        }

        const tooltip = document.getElementById('artifactTooltip');
        let tooltipTimeout = null;
        let currentTooltipItem = null;

        function positionTooltip(event) {
            const margin = 15;
            const rect = tooltip.getBoundingClientRect();
            let x = event.clientX + margin;
            let y = event.clientY - 10;
            if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - margin;
            if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
            tooltip.style.left = Math.max(8, x) + 'px';
            tooltip.style.top = Math.max(8, y) + 'px';
        }

        function getPropertyClass(key, value) {
            const num = SC.parsePropertyValue(value);
            if (!Number.isFinite(num) || num === 0) return 'property-neutral';
            // Для радиации минус — это хорошо (артефакт её снижает)
            const isGood = key === 'Радиация' ? num < 0 : num > 0;
            return isGood ? 'property-positive' : 'property-negative';
        }

        function showTooltip(artifact, event) {
            const entries = Object.entries(artifact.properties || {});
            if (entries.length === 0) return;

            tooltip.textContent = '';
            const title = document.createElement('strong');
            title.textContent = artifact.name;
            tooltip.appendChild(title);

            entries.forEach(([key, value]) => {
                const row = document.createElement('div');
                const span = document.createElement('span');
                span.className = getPropertyClass(key, value);
                span.textContent = `${key}: ${value}`;
                row.appendChild(span);
                tooltip.appendChild(row);
            });

            positionTooltip(event);
            tooltip.style.opacity = '1';
        }

        function hideTooltip() {
            tooltip.style.opacity = '0';
            currentTooltipItem = null;
        }

        function updateTooltipPosition(event) {
            if (currentTooltipItem) positionTooltip(event);
        }

        const totalDisplay = document.getElementById('totalSum');
        const iigTotalDisplay = document.getElementById('iigTotalSum');
        const finalDisplay = document.getElementById('finalSum');
        const iigFinalDisplay = document.getElementById('iigFinalSum');
        const bonusButtons = document.querySelectorAll('.header-stats .bonus-btn');
        const resetBtn = document.getElementById('resetBtn');
        const searchInput = document.getElementById('searchInput');
        const exportBtn = document.getElementById('exportBtn');
        const buttonsContainer = document.getElementById('buttonsContainer');

        SC.setupSectionAccess('artifacts', [
            document.querySelector('.artifact-title'),
            document.querySelector('.header-stats'),
            document.querySelector('.content')
        ]);

        // Автоматическая отправка сумм в Яндекс.Метрику: срабатывает через 1.5 сек
        // после последнего изменения корзины, и только если сумма больше 0.
        const metrikaSender = SC.createDebouncedMetrikaSender('artifacts_send_result', 1500);

        function getSelectedItems() {
            const items = [];
            artifacts.forEach(artifact => {
                const span = quantityElements.get(artifact.name);
                const qty = parseInt(span.textContent, 10);
                if (qty > 0) {
                    items.push({ name: artifact.name, qty, price: artifact.price });
                }
            });
            return items;
        }

        function buildMetrikaPayload() {
            const items = getSelectedItems();
            return {
                totalSum,
                bonus: currentBonus,
                finalSum: Math.round(totalSum * (1 + currentBonus / 100)),
                totalSumIig: iigTotalSum,
                itemsCount: items.length,
                items
            };
        }

        function scheduleMetrikaSend() {
            metrikaSender.schedule(buildMetrikaPayload);
        }

        let totalSum = 0;
        let iigTotalSum = 0;
        let currentBonus = 0;
        const quantityElements = new Map();
        const artifactCards = new Map();
        const artifactImageFolder = 'артефакты V2';
        const artifactProperties = Array.from(new Set(
            artifacts.flatMap(artifact => Object.keys(artifact.properties || {}))
        )).sort((a, b) => a.localeCompare(b, 'ru'));
        const artifactPropertySelect = document.createElement('select');
        const artifactSortSelect = document.createElement('select');

        function getLocalArtifactImagePath(name) {
            return `${artifactImageFolder}/${encodeURIComponent(name)}.png`;
        }

        artifacts.forEach((artifact) => {
            artifact.image = getLocalArtifactImagePath(artifact.name);
        });

        function createArtifactTools() {
            const tools = document.createElement('div');
            tools.className = 'artifact-tools';

            const propertyLabel = document.createElement('label');
            propertyLabel.className = 'artifact-tool';
            propertyLabel.textContent = 'Свойство';
            artifactPropertySelect.id = 'artifactPropertyFilter';
            artifactPropertySelect.innerHTML = '<option value="">Все свойства</option>';
            artifactProperties.forEach(property => {
                const option = document.createElement('option');
                option.value = property;
                option.textContent = property;
                artifactPropertySelect.appendChild(option);
            });
            propertyLabel.appendChild(artifactPropertySelect);

            const sortLabel = document.createElement('label');
            sortLabel.className = 'artifact-tool';
            sortLabel.textContent = 'Сортировка';
            artifactSortSelect.id = 'artifactSortSelect';
            artifactSortSelect.innerHTML = `
                <option value="default">По умолчанию</option>
                <option value="name-asc">Название А-Я</option>
                <option value="name-desc">Название Я-А</option>
                <option value="price-asc">Цена по возрастанию</option>
                <option value="price-desc">Цена по убыванию</option>
                <option value="property-asc">Свойство по возрастанию</option>
                <option value="property-desc">Свойство по убыванию</option>
            `;
            sortLabel.appendChild(artifactSortSelect);

            tools.appendChild(propertyLabel);
            tools.appendChild(sortLabel);
            document.querySelector('.header-stats').appendChild(tools);
        }

        function updateArtifactList() {
            const term = searchInput.value.toLowerCase().trim();
            const selectedProperty = artifactPropertySelect.value;
            const sortMode = artifactSortSelect.value;
            const sortedArtifacts = [...artifacts];

            sortedArtifacts.sort((a, b) => {
                if (sortMode === 'name-asc') return a.name.localeCompare(b.name, 'ru');
                if (sortMode === 'name-desc') return b.name.localeCompare(a.name, 'ru');
                if (sortMode === 'price-asc') return a.price - b.price || a.name.localeCompare(b.name, 'ru');
                if (sortMode === 'price-desc') return b.price - a.price || a.name.localeCompare(b.name, 'ru');
                if (sortMode === 'property-asc' || sortMode === 'property-desc') {
                    const aValue = SC.parsePropertyValue(a.properties?.[selectedProperty]);
                    const bValue = SC.parsePropertyValue(b.properties?.[selectedProperty]);
                    const direction = sortMode === 'property-asc' ? 1 : -1;
                    return (aValue - bValue) * direction || a.name.localeCompare(b.name, 'ru');
                }
                return 0;
            });

            sortedArtifacts.forEach(artifact => {
                const card = artifactCards.get(artifact.name);
                if (!card) return;

                const matchesSearch = term === '' || artifact.name.toLowerCase().includes(term);
                const matchesProperty = selectedProperty === '' || Boolean(artifact.properties?.[selectedProperty]);
                card.classList.toggle('hidden', !matchesSearch || !matchesProperty);
                buttonsContainer.appendChild(card);
            });
        }

        function savePricesToStorage() {
            const prices = Object.fromEntries(artifacts.map(a => [a.name, { price: a.price, iig: a.iigPrice }]));
            localStorage.setItem('artifactPricesByName', JSON.stringify(prices));
            localStorage.removeItem('artifactPrices');
        }

        function updateTotals() {
            totalDisplay.textContent = totalSum.toLocaleString('ru-RU');
            iigTotalDisplay.textContent = iigTotalSum.toLocaleString('ru-RU');
            const finalSum = Math.round(totalSum * (1 + currentBonus / 100));
            const iigFinalSum = Math.round(iigTotalSum * (1 + currentBonus / 100));
            finalDisplay.textContent = finalSum.toLocaleString('ru-RU');
            iigFinalDisplay.textContent = iigFinalSum.toLocaleString('ru-RU');
        }

        function createButton(artifact) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            itemDiv.dataset.artifactName = artifact.name.toLowerCase();
            itemDiv.dataset.artifactProperties = Object.keys(artifact.properties || {}).join('|').toLowerCase();

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = artifact.name;
            itemDiv.appendChild(nameDiv);

            const imgButton = document.createElement('button');
            imgButton.type = 'button';
            imgButton.className = 'image-button';
            const img = document.createElement('img');
            img.src = artifact.image;
            img.alt = artifact.name;
            img.onerror = function () {
                // Попытка альтернативных путей к картинкам (ASCII-папки), затем fallback
                try {
                    if (!this._triedAlt) {
                        this._triedAlt = 1;
                        this.src = `artifacts/${encodeURIComponent(artifact.name)}.png`;
                        return;
                    }
                    if (!this._triedAlt2) {
                        this._triedAlt2 = 1;
                        this.src = `artifacts_v2/${encodeURIComponent(artifact.name)}.png`;
                        return;
                    }
                } catch (err) {
                    // ignore
                }
                this.src = SC.fallbackImage;
            };
            imgButton.appendChild(img);
            itemDiv.appendChild(imgButton);

            const priceDiv = document.createElement('div');
            priceDiv.className = 'price';
            priceDiv.innerHTML = `<span class="artifact-price-saharov">Сахаров: ${artifact.price}</span>${artifact.iigPrice > 0 ? `<span class="artifact-price-iig">ИИГ: ${artifact.iigPrice}</span>` : ''}`;
            priceDiv.dataset.artifactName = artifact.name;
            itemDiv.appendChild(priceDiv);

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'controls';
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';

            const subBtn = document.createElement('button');
            subBtn.type = 'button';
            subBtn.className = 'btn-control';
            subBtn.textContent = '−';

            const quantitySpan = document.createElement('div');
            quantitySpan.className = 'quantity';
            quantitySpan.textContent = '0';
            quantityElements.set(artifact.name, quantitySpan);

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn-control';
            addBtn.textContent = '+';

            const updateQuantity = (delta) => {
                const currentQty = parseInt(quantitySpan.textContent, 10);
                const nextQty = Math.max(0, currentQty + delta);
                const actualDelta = nextQty - currentQty;

                if (actualDelta === 0) return;

                quantitySpan.textContent = nextQty;
                SC.updateItemSelectedState(itemDiv, nextQty);
                totalSum += actualDelta * artifact.price;
                iigTotalSum += actualDelta * artifact.iigPrice;
                updateTotals();
                scheduleMetrikaSend();
            };

            addBtn.addEventListener('click', () => updateQuantity(1));
            subBtn.addEventListener('click', () => updateQuantity(-1));

            imgButton.addEventListener('click', (e) => {
                if (e.shiftKey || e.button === 2) {
                    e.preventDefault();
                    updateQuantity(-1);
                } else {
                    updateQuantity(1);
                }
            });

            imgButton.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                updateQuantity(-1);
            });

            itemDiv.addEventListener('mousedown', (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    const currentQty = parseInt(quantitySpan.textContent, 10);
                    if (currentQty > 0) {
                        totalSum -= currentQty * artifact.price;
                        iigTotalSum -= currentQty * artifact.iigPrice;
                        quantitySpan.textContent = '0';
                        SC.updateItemSelectedState(itemDiv, 0);
                        updateTotals();
                        scheduleMetrikaSend();
                    }
                }
            });

            itemDiv.addEventListener('contextmenu', (e) => e.preventDefault());

            itemDiv.addEventListener('mouseenter', (e) => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                tooltipTimeout = setTimeout(() => {
                    currentTooltipItem = artifact.name;
                    showTooltip(artifact, e);
                }, 300);
            });

            itemDiv.addEventListener('mousemove', (e) => {
                if (currentTooltipItem === artifact.name) {
                    updateTooltipPosition(e);
                }
            });

            itemDiv.addEventListener('mouseleave', () => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                if (currentTooltipItem === artifact.name) {
                    hideTooltip();
                }
            });

            priceDiv.addEventListener('dblclick', () => {
                if (priceDiv.querySelector('input')) return; // не создаём второе поле
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'price-input';
                input.setAttribute('aria-label', `Цена ${artifact.name}`);
                input.value = artifact.price;
                input.min = '0';
                input.step = '1';

                priceDiv.textContent = '';
                priceDiv.appendChild(input);
                input.focus();
                input.select();

                let finished = false;
                const saveNewPrice = () => {
                    if (finished) return; // Enter + blur не должны сохранять дважды
                    finished = true;
                    const parsedPrice = parseInt(input.value, 10);
                    const newPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : artifact.price;
                    artifact.price = newPrice;
                    priceDiv.innerHTML = `<span class="artifact-price-saharov">Сахаров: ${artifact.price}</span>${artifact.iigPrice > 0 ? `<span class="artifact-price-iig">ИИГ: ${artifact.iigPrice}</span>` : ''}`;

                    totalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                        const art = artifacts.find(a => a.name === name);
                        return sum + (parseInt(span.textContent, 10) * art.price);
                    }, 0);
                    iigTotalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                        const art = artifacts.find(a => a.name === name);
                        return sum + (parseInt(span.textContent, 10) * art.iigPrice);
                    }, 0);
                    updateTotals();
                    updateArtifactList();
                    savePricesToStorage();
                    scheduleMetrikaSend();
                };

                input.addEventListener('blur', saveNewPrice);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveNewPrice();
                    if (e.key === 'Escape') {
                        finished = true;
                        priceDiv.innerHTML = `<span class="artifact-price-saharov">Сахаров: ${artifact.price}</span>${artifact.iigPrice > 0 ? `<span class="artifact-price-iig">ИИГ: ${artifact.iigPrice}</span>` : ''}`;
                    }
                });
            });

            buttonGroup.appendChild(subBtn);
            buttonGroup.appendChild(quantitySpan);
            buttonGroup.appendChild(addBtn);
            controlsDiv.appendChild(buttonGroup);
            itemDiv.appendChild(controlsDiv);
            artifactCards.set(artifact.name, itemDiv);
            buttonsContainer.appendChild(itemDiv);
        }

        searchInput.addEventListener('input', updateArtifactList);
        artifactPropertySelect.addEventListener('change', updateArtifactList);
        artifactSortSelect.addEventListener('change', updateArtifactList);

        bonusButtons.forEach(btn => btn.addEventListener('click', () => {
            bonusButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBonus = parseInt(btn.dataset.bonus, 10);
            updateTotals();
            scheduleMetrikaSend();
        }));

        resetBtn.addEventListener('click', () => {
            totalSum = 0;
            iigTotalSum = 0;
            currentBonus = 0;
            bonusButtons.forEach(b => b.classList.remove('active'));
            bonusButtons[0].classList.add('active');
            quantityElements.forEach(span => span.textContent = '0');
            artifactCards.forEach(card => SC.updateItemSelectedState(card, 0));
            searchInput.value = '';
            artifactPropertySelect.value = '';
            artifactSortSelect.value = 'default';
            updateArtifactList();
            updateTotals();
            metrikaSender.cancel();
        });

        exportBtn.addEventListener('click', () => {
            let report = '=== ОТЧЁТ ПО АРТЕФАКТАМ ===\n\n';
            let hasItems = false;

            artifacts.forEach(artifact => {
                const span = quantityElements.get(artifact.name);
                const qty = parseInt(span.textContent, 10);
                if (qty > 0) {
                    report += `${artifact.name}: ${qty} шт. × ${artifact.price} = ${(qty * artifact.price).toLocaleString('ru-RU')} руб.\n`;
                    hasItems = true;
                }
            });

            if (!hasItems) report += 'Нет выбранных артефактов\n';

            report += `\nБазовая сумма: ${totalSum.toLocaleString('ru-RU')} руб.`;
            report += `\nНадбавка: ${currentBonus}%`;
            report += `\nИТОГО: ${Math.round(totalSum * (1 + currentBonus / 100)).toLocaleString('ru-RU')} руб.`;

            const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stalker_report_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        const modal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const priceTableBody = document.getElementById('priceTableBody');
        const savePricesBtn = document.getElementById('savePricesBtn');

        function populatePriceTable() {
            priceTableBody.innerHTML = '';
            artifacts.forEach((artifact, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td></td>
                    <td>
                        <label>Сахаров <input type="number" id="price_${index}" value="${artifact.price}" min="0" step="1"></label>
                        <label>ИИГ <input type="number" id="iigPrice_${index}" value="${artifact.iigPrice || 0}" min="0" step="1"></label>
                    </td>
                `;
                row.firstElementChild.textContent = artifact.name;
                priceTableBody.appendChild(row);
            });
        }

        settingsBtn.addEventListener('click', () => {
            populatePriceTable();
            modal.style.display = 'block';
        });

        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') modal.style.display = 'none';
        });

        savePricesBtn.addEventListener('click', () => {
            artifacts.forEach((artifact, index) => {
                const input = document.getElementById(`price_${index}`);
                const parsedPrice = parseInt(input.value, 10);
                artifact.price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : artifact.price;
                const iigInput = document.getElementById(`iigPrice_${index}`);
                const parsedIigPrice = parseInt(iigInput.value, 10);
                artifact.iigPrice = Number.isFinite(parsedIigPrice) && parsedIigPrice >= 0 ? parsedIigPrice : artifact.iigPrice;
            });

            document.querySelectorAll('#buttonsContainer .price').forEach((priceDiv) => {
                const artifact = artifacts.find(a => a.name === priceDiv.dataset.artifactName);
                if (artifact) {
                    priceDiv.innerHTML = `<span class="artifact-price-saharov">Сахаров: ${artifact.price}</span>${artifact.iigPrice > 0 ? `<span class="artifact-price-iig">ИИГ: ${artifact.iigPrice}</span>` : ''}`;
                }
            });

            totalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                const art = artifacts.find(a => a.name === name);
                return sum + (parseInt(span.textContent, 10) * art.price);
            }, 0);
            iigTotalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                const art = artifacts.find(a => a.name === name);
                return sum + (parseInt(span.textContent, 10) * art.iigPrice);
            }, 0);
            updateTotals();
            updateArtifactList();

            savePricesToStorage();
            modal.style.display = 'none';
            scheduleMetrikaSend();
        });

        totalDisplay.addEventListener('click', (e) => SC.copyToClipboard(totalSum.toString(), e));
        iigTotalDisplay.addEventListener('click', (e) => SC.copyToClipboard(iigTotalSum.toString(), e));
        finalDisplay.addEventListener('click', (e) => SC.copyToClipboard(Math.round(totalSum * (1 + currentBonus / 100)).toString(), e));
        iigFinalDisplay.addEventListener('click', (e) => SC.copyToClipboard(Math.round(iigTotalSum * (1 + currentBonus / 100)).toString(), e));

        createArtifactTools();
        artifacts.forEach(a => createButton(a));
        updateArtifactList();
        bonusButtons[0].classList.add('active');
    };
})();
