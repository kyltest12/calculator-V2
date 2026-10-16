(function () {
    "use strict";

    const SC = window.StalkerCalc;
    const PRICES_KEY = 'artifactPricesByName';
    const LEGACY_PRICES_KEY = 'artifactPrices';

    SC.initArtifacts = function (artifactsData) {
        const artifacts = artifactsData.map(item => ({
            name: item.name,
            price: item.price,
            properties: item.properties || {},
            image: ''
        }));

        // Цены хранятся по названию (раньше — по индексу, из-за чего они «съезжали» при смене порядка в JSON)
        function loadSavedPrices() {
            try {
                const saved = localStorage.getItem(PRICES_KEY);
                if (saved) {
                    const prices = JSON.parse(saved);
                    if (prices && typeof prices === 'object' && !Array.isArray(prices)) {
                        artifacts.forEach(artifact => {
                            const p = prices[artifact.name];
                            if (Number.isFinite(p) && p >= 0) artifact.price = p;
                        });
                    }
                    return;
                }

                // Миграция со старого формата (массив по индексам)
                const legacy = localStorage.getItem(LEGACY_PRICES_KEY);
                if (legacy) {
                    const prices = JSON.parse(legacy);
                    if (Array.isArray(prices)) {
                        artifacts.forEach((artifact, index) => {
                            const p = prices[index];
                            if (Number.isFinite(p) && p >= 0) artifact.price = p;
                        });
                        savePricesToStorage();
                    }
                    localStorage.removeItem(LEGACY_PRICES_KEY);
                }
            } catch (error) {
                console.warn('Не удалось загрузить сохраненные цены:', error);
                localStorage.removeItem(PRICES_KEY);
                localStorage.removeItem(LEGACY_PRICES_KEY);
            }
        }

        function savePricesToStorage() {
            const prices = Object.fromEntries(artifacts.map(a => [a.name, a.price]));
            localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
        }

        loadSavedPrices();

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
        const finalDisplay = document.getElementById('finalSum');
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

        let totalSum = 0;
        let currentBonus = 0;
        const quantityElements = new Map();
        const artifactCards = new Map();
        const artifactByName = new Map(artifacts.map(a => [a.name, a]));
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
                if ((sortMode === 'property-asc' || sortMode === 'property-desc') && selectedProperty) {
                    const aValue = SC.parsePropertyValue(a.properties?.[selectedProperty]);
                    const bValue = SC.parsePropertyValue(b.properties?.[selectedProperty]);
                    const direction = sortMode === 'property-asc' ? 1 : -1;
                    // Артефакты без свойства всегда внизу списка
                    if (aValue === bValue) return a.name.localeCompare(b.name, 'ru');
                    if (aValue === Number.NEGATIVE_INFINITY) return 1;
                    if (bValue === Number.NEGATIVE_INFINITY) return -1;
                    return (aValue - bValue) * direction;
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

        function recalcTotal() {
            totalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                return sum + parseInt(span.textContent, 10) * artifactByName.get(name).price;
            }, 0);
        }

        function updateTotals() {
            totalDisplay.textContent = totalSum.toLocaleString('ru-RU');
            const finalSum = Math.round(totalSum * (1 + currentBonus / 100));
            finalDisplay.textContent = finalSum.toLocaleString('ru-RU');
        }

        function createButton(artifact) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            itemDiv.dataset.artifactName = artifact.name.toLowerCase();

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = artifact.name;
            itemDiv.appendChild(nameDiv);

            const imgButton = document.createElement('button');
            imgButton.className = 'image-button';
            imgButton.type = 'button';
            imgButton.setAttribute('aria-label', `Добавить: ${artifact.name}`);
            const img = document.createElement('img');
            img.src = artifact.image;
            img.alt = artifact.name;
            img.loading = 'lazy';
            img.onerror = function () { this.onerror = null; this.src = SC.fallbackImage; };
            imgButton.appendChild(img);
            itemDiv.appendChild(imgButton);

            const priceDiv = document.createElement('div');
            priceDiv.className = 'price';
            priceDiv.textContent = artifact.price + ' руб.';
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
            subBtn.setAttribute('aria-label', 'Убрать одну штуку');

            const quantitySpan = document.createElement('div');
            quantitySpan.className = 'quantity';
            quantitySpan.textContent = '0';
            quantityElements.set(artifact.name, quantitySpan);

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn-control';
            addBtn.textContent = '+';
            addBtn.setAttribute('aria-label', 'Добавить одну штуку');

            const updateQuantity = (delta) => {
                const currentQty = parseInt(quantitySpan.textContent, 10);
                const nextQty = Math.max(0, currentQty + delta);
                const actualDelta = nextQty - currentQty;

                if (actualDelta === 0) return;

                quantitySpan.textContent = nextQty;
                SC.updateItemSelectedState(itemDiv, nextQty);
                totalSum += actualDelta * artifact.price;
                updateTotals();
            };

            addBtn.addEventListener('click', () => updateQuantity(1));
            subBtn.addEventListener('click', () => updateQuantity(-1));

            imgButton.addEventListener('click', (e) => {
                updateQuantity(e.shiftKey ? -1 : 1);
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
                        quantitySpan.textContent = '0';
                        SC.updateItemSelectedState(itemDiv, 0);
                        updateTotals();
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
                if (currentTooltipItem === artifact.name) updateTooltipPosition(e);
            });

            itemDiv.addEventListener('mouseleave', () => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                if (currentTooltipItem === artifact.name) hideTooltip();
            });

            priceDiv.addEventListener('dblclick', () => {
                if (priceDiv.querySelector('input')) return; // не создаём второе поле

                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'price-input';
                input.value = artifact.price;
                input.min = '0';
                input.step = '1';

                priceDiv.textContent = '';
                priceDiv.appendChild(input);
                input.focus();
                input.select();

                let saved = false;
                const saveNewPrice = () => {
                    if (saved) return; // Enter + blur не должны сохранять дважды
                    saved = true;

                    const parsedPrice = parseInt(input.value, 10);
                    const newPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : artifact.price;
                    artifact.price = newPrice;
                    priceDiv.textContent = newPrice + ' руб.';

                    recalcTotal();
                    updateTotals();
                    updateArtifactList();
                    savePricesToStorage();
                };

                input.addEventListener('blur', saveNewPrice);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveNewPrice();
                    if (e.key === 'Escape') {
                        saved = true;
                        priceDiv.textContent = artifact.price + ' руб.';
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
        }));

        resetBtn.addEventListener('click', () => {
            totalSum = 0;
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
        });

        exportBtn.addEventListener('click', () => {
            let report = '=== ОТЧЁТ ПО АРТЕФАКТАМ ===\n\n';
            let hasItems = false;

            artifacts.forEach(artifact => {
                const qty = parseInt(quantityElements.get(artifact.name).textContent, 10);
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

        // === Модальное окно настроек цен ===
        const modal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const priceTableBody = document.getElementById('priceTableBody');
        const savePricesBtn = document.getElementById('savePricesBtn');

        const openModal = () => { modal.style.display = 'block'; };
        const closeModal = () => { modal.style.display = 'none'; };

        function populatePriceTable() {
            priceTableBody.innerHTML = '';
            artifacts.forEach((artifact, index) => {
                const row = document.createElement('tr');
                const nameCell = document.createElement('td');
                nameCell.textContent = artifact.name;
                const priceCell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `price_${index}`;
                input.value = artifact.price;
                input.min = '0';
                input.step = '1';
                priceCell.appendChild(input);
                row.appendChild(nameCell);
                row.appendChild(priceCell);
                priceTableBody.appendChild(row);
            });
        }

        settingsBtn.addEventListener('click', () => {
            populatePriceTable();
            openModal();
        });

        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') closeModal();
        });

        savePricesBtn.addEventListener('click', () => {
            artifacts.forEach((artifact, index) => {
                const input = document.getElementById(`price_${index}`);
                const parsedPrice = parseInt(input.value, 10);
                artifact.price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : artifact.price;
            });

            document.querySelectorAll('#buttonsContainer .price').forEach((priceDiv) => {
                if (priceDiv.querySelector('input')) return;
                const artifact = artifactByName.get(priceDiv.dataset.artifactName);
                if (artifact) priceDiv.textContent = artifact.price + ' руб.';
            });

            recalcTotal();
            updateTotals();
            updateArtifactList();
            savePricesToStorage();
            closeModal();
        });

        totalDisplay.addEventListener('click', (e) => SC.copyToClipboard(totalSum.toString(), e));
        finalDisplay.addEventListener('click', (e) => SC.copyToClipboard(Math.round(totalSum * (1 + currentBonus / 100)).toString(), e));

        createArtifactTools();
        artifacts.forEach(a => createButton(a));
        updateArtifactList();
        bonusButtons[0].classList.add('active');
    };
})();
