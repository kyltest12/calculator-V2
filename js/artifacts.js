(function () {
    "use strict";

    const SC = window.StalkerCalc;

    SC.initArtifacts = function (artifactsData) {
        let artifacts = artifactsData.map(item => ({
            name: item.name,
            price: item.price,
            properties: item.properties || {},
            image: ''
        }));

        const savedPrices = localStorage.getItem('artifactPrices');
        if (savedPrices) {
            try {
                const prices = JSON.parse(savedPrices);
                if (Array.isArray(prices)) {
                    artifacts.forEach((artifact, index) => {
                        const savedPrice = prices[index];
                        if (Number.isFinite(savedPrice) && savedPrice >= 0) {
                            artifact.price = savedPrice;
                        }
                    });
                }
            } catch (error) {
                console.warn('Не удалось загрузить сохраненные цены:', error);
                localStorage.removeItem('artifactPrices');
            }
        }

        const tooltip = document.getElementById('artifactTooltip');
        let tooltipTimeout = null;
        let currentTooltipItem = null;

        function showTooltip(artifact, event) {
            if (!artifact.properties || Object.keys(artifact.properties).length === 0) return;

            let propertiesHtml = `<strong>${artifact.name}</strong>`;
            for (const [key, value] of Object.entries(artifact.properties)) {
                let valueClass = 'property-neutral';
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    if (numValue > 0) valueClass = 'property-positive';
                    else if (numValue < 0) valueClass = 'property-negative';
                } else {
                    if (value.includes('+')) valueClass = 'property-positive';
                    else if (value.includes('-')) valueClass = 'property-negative';
                }
                propertiesHtml += `<div><span class="${valueClass}">${key}: ${value}</span></div>`;
            }

            tooltip.innerHTML = propertiesHtml;
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
            tooltip.style.opacity = '1';
        }

        function hideTooltip() {
            tooltip.style.opacity = '0';
            currentTooltipItem = null;
        }

        function updateTooltipPosition(event) {
            if (currentTooltipItem) {
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY - 10) + 'px';
            }
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
            const prices = artifacts.map(a => a.price);
            localStorage.setItem('artifactPrices', JSON.stringify(prices));
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
            itemDiv.dataset.artifactProperties = Object.keys(artifact.properties || {}).join('|').toLowerCase();

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = artifact.name;
            itemDiv.appendChild(nameDiv);

            const imgButton = document.createElement('button');
            imgButton.className = 'image-button';
            const img = document.createElement('img');
            img.src = artifact.image;
            img.alt = artifact.name;
            img.onerror = function () { this.src = SC.fallbackImage; };
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
            subBtn.className = 'btn-control';
            subBtn.textContent = '−';

            const quantitySpan = document.createElement('div');
            quantitySpan.className = 'quantity';
            quantitySpan.textContent = '0';
            quantityElements.set(artifact.name, quantitySpan);

            const addBtn = document.createElement('button');
            addBtn.className = 'btn-control';
            addBtn.textContent = '+';

            const updateQuantity = (delta) => {
                const currentQty = parseInt(quantitySpan.textContent);
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
                    const currentQty = parseInt(quantitySpan.textContent);
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
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'price-input';
                input.value = artifact.price;
                input.min = '0';
                input.step = '1';

                priceDiv.textContent = '';
                priceDiv.appendChild(input);
                input.focus();

                const saveNewPrice = () => {
                    const parsedPrice = parseInt(input.value, 10);
                    const newPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : artifact.price;
                    artifact.price = newPrice;
                    priceDiv.textContent = newPrice + ' руб.';

                    totalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                        const art = artifacts.find(a => a.name === name);
                        return sum + (parseInt(span.textContent) * art.price);
                    }, 0);
                    updateTotals();
                    updateArtifactList();
                    savePricesToStorage();
                };

                input.addEventListener('blur', saveNewPrice);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') saveNewPrice();
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
            currentBonus = parseInt(btn.dataset.bonus);
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
                const span = quantityElements.get(artifact.name);
                const qty = parseInt(span.textContent);
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
                    <td>${artifact.name}</td>
                    <td><input type="number" id="price_${index}" value="${artifact.price}" min="0" step="1"></td>
                `;
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

        savePricesBtn.addEventListener('click', () => {
            artifacts.forEach((artifact, index) => {
                const input = document.getElementById(`price_${index}`);
                const parsedPrice = parseInt(input.value, 10);
                artifact.price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : artifact.price;
            });

            document.querySelectorAll('#buttonsContainer .price').forEach((priceDiv) => {
                const artifact = artifacts.find(a => a.name === priceDiv.dataset.artifactName);
                if (artifact) priceDiv.textContent = artifact.price + ' руб.';
            });

            totalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
                const art = artifacts.find(a => a.name === name);
                return sum + (parseInt(span.textContent) * art.price);
            }, 0);
            updateTotals();
            updateArtifactList();

            savePricesToStorage();
            modal.style.display = 'none';
        });

        totalDisplay.addEventListener('click', (e) => SC.copyToClipboard(totalSum.toString(), e));
        finalDisplay.addEventListener('click', (e) => SC.copyToClipboard(Math.round(totalSum * (1 + currentBonus / 100)).toString(), e));

        createArtifactTools();
        artifacts.forEach(a => createButton(a));
        updateArtifactList();
        bonusButtons[0].classList.add('active');

        return {
            getState() {
                const items = [];
                artifacts.forEach(artifact => {
                    const span = quantityElements.get(artifact.name);
                    const qty = parseInt(span.textContent, 10);
                    if (qty > 0) {
                        items.push({ name: artifact.name, qty, price: artifact.price });
                    }
                });
                return {
                    items,
                    totalSum,
                    bonus: currentBonus,
                    finalSum: Math.round(totalSum * (1 + currentBonus / 100))
                };
            },
            restoreState(deal) {
                totalSum = 0;
                currentBonus = deal.bonus || 0;
                bonusButtons.forEach(b => b.classList.remove('active'));
                const activeBtn = Array.from(bonusButtons).find(b => parseInt(b.dataset.bonus, 10) === currentBonus);
                (activeBtn || bonusButtons[0]).classList.add('active');

                const qtyMap = new Map(deal.items.map(item => [item.name, item.qty]));
                quantityElements.forEach((span, name) => {
                    const qty = qtyMap.get(name) || 0;
                    span.textContent = String(qty);
                    const card = artifactCards.get(name);
                    if (card) SC.updateItemSelectedState(card, qty);
                    const art = artifacts.find(a => a.name === name);
                    if (art) totalSum += qty * art.price;
                });
                updateTotals();
            }
        };
    };
})();
