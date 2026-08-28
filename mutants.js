(function () {
    "use strict";

    const SC = window.StalkerCalc;

    SC.initMutants = function (mutantsData) {
        const mutantImageFolder = 'мутанты';
        const mutantImageAliases = mutantsData.imageAliases || {};
        const mutantPriceVersion = mutantsData.priceVersion || '2026-04-24';
        const savedMutantPrices = localStorage.getItem('mutantPartPrices');
        const savedMutantPriceVersion = localStorage.getItem('mutantPartPricesVersion');

        if (savedMutantPriceVersion !== mutantPriceVersion) {
            localStorage.removeItem('mutantPartPrices');
            localStorage.setItem('mutantPartPricesVersion', mutantPriceVersion);
        }

        function getLocalMutantImagePath(name) {
            const imageName = mutantImageAliases[name] || name;
            return `${mutantImageFolder}/${encodeURIComponent(imageName)}.png`;
        }

        const mutantParts = mutantsData.parts.map(part => ({
            name: part.name,
            grehPrice: part.grehPrice,
            dolgPrice: part.dolgPrice,
            image: getLocalMutantImagePath(part.name)
        }));

        if (savedMutantPrices) {
            try {
                const prices = JSON.parse(savedMutantPrices);
                if (prices && !Array.isArray(prices) && typeof prices === 'object') {
                    mutantParts.forEach(part => {
                        const saved = prices[part.name];
                        if (saved && typeof saved === 'object') {
                            if (Number.isFinite(saved.greh) && saved.greh >= 0) part.grehPrice = saved.greh;
                            if (Number.isFinite(saved.dolg) && saved.dolg >= 0) part.dolgPrice = saved.dolg;
                        }
                    });
                } else {
                    localStorage.removeItem('mutantPartPrices');
                }
            } catch (error) {
                console.warn('Не удалось загрузить сохраненные цены частей мутантов:', error);
                localStorage.removeItem('mutantPartPrices');
            }
        }

        function saveMutantPricesToStorage() {
            const prices = Object.fromEntries(mutantParts.map(part => [part.name, { greh: part.grehPrice, dolg: part.dolgPrice }]));
            localStorage.setItem('mutantPartPrices', JSON.stringify(prices));
        }

        const mutantTotalDisplayGreh = document.getElementById('mutantTotalSumGreh');
        const mutantTotalDisplayDolg = document.getElementById('mutantTotalSumDolg');
        const mutantFinalDisplayGreh = document.getElementById('mutantFinalSumGreh');
        const mutantFinalDisplayDolg = document.getElementById('mutantFinalSumDolg');
        const mutantBonusButtons = document.querySelectorAll('.mutant-bonus-btn');
        const mutantSearchInput = document.getElementById('mutantSearchInput');
        const mutantButtonsContainer = document.getElementById('mutantButtonsContainer');
        let mutantTotalSumGreh = 0;
        let mutantTotalSumDolg = 0;
        let currentMutantBonus = 0;
        const mutantQuantityElements = new Map();
        const mutantCards = new Map();

        SC.setupSectionAccess('mutants', [
            document.querySelector('.mutant-title'),
            document.querySelector('.mutant-section')
        ]);

        // Автоматическая отправка сумм в Яндекс.Метрику: срабатывает через 1.5 сек
        // после последнего изменения корзины, и только если сумма больше 0.
        const metrikaSender = SC.createDebouncedMetrikaSender('mutants_send_result', 1500);

        function getSelectedParts() {
            const items = [];
            mutantParts.forEach(part => {
                const span = mutantQuantityElements.get(part.name);
                const qty = parseInt(span.textContent, 10);
                if (qty > 0) {
                    items.push({ name: part.name, qty, grehPrice: part.grehPrice, dolgPrice: part.dolgPrice });
                }
            });
            return items;
        }

        function buildMetrikaPayload() {
            const items = getSelectedParts();
            return {
                totalSum: mutantTotalSumGreh, // основная сумма для проверки на > 0 в отправщике
                totalSumGreh: mutantTotalSumGreh,
                totalSumDolg: mutantTotalSumDolg,
                bonus: currentMutantBonus,
                finalSumGreh: Math.round(mutantTotalSumGreh * (1 - currentMutantBonus / 100)),
                finalSumDolg: Math.round(mutantTotalSumDolg * (1 - currentMutantBonus / 100)),
                itemsCount: items.length,
                items
            };
        }

        function scheduleMetrikaSend() {
            metrikaSender.schedule(buildMetrikaPayload);
        }

        function updateMutantTotals() {
            mutantTotalDisplayGreh.textContent = mutantTotalSumGreh.toLocaleString('ru-RU');
            mutantTotalDisplayDolg.textContent = mutantTotalSumDolg.toLocaleString('ru-RU');
            mutantFinalDisplayGreh.textContent = Math.round(mutantTotalSumGreh * (1 - currentMutantBonus / 100)).toLocaleString('ru-RU');
            mutantFinalDisplayDolg.textContent = Math.round(mutantTotalSumDolg * (1 - currentMutantBonus / 100)).toLocaleString('ru-RU');
        }

        function updateMutantList() {
            const searchTerm = mutantSearchInput.value.toLowerCase().trim();
            mutantCards.forEach((card, name) => {
                const matches = searchTerm === '' || name.toLowerCase().includes(searchTerm);
                card.classList.toggle('hidden', !matches);
            });
        }

        function recalcTotalsFromQuantities() {
            mutantTotalSumGreh = 0;
            mutantTotalSumDolg = 0;
            mutantQuantityElements.forEach((span, name) => {
                const qty = parseInt(span.textContent, 10);
                const part = mutantParts.find(item => item.name === name);
                if (part && qty > 0) {
                    mutantTotalSumGreh += qty * part.grehPrice;
                    mutantTotalSumDolg += qty * part.dolgPrice;
                }
            });
        }

        function createMutantButton(part) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item mutant-item';
            itemDiv.dataset.mutantName = part.name.toLowerCase();

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = part.name;

            const imgButton = document.createElement('button');
            imgButton.className = 'image-button';
            const img = document.createElement('img');
            img.src = part.image;
            img.alt = part.name;
            img.onerror = function () { this.src = SC.fallbackImage; };
            imgButton.appendChild(img);

            const priceDiv = document.createElement('div');
            priceDiv.className = 'price';

            const priceGrehSpan = document.createElement('span');
            priceGrehSpan.className = 'mutant-price-greh';
            priceGrehSpan.textContent = 'Грех: ' + part.grehPrice + ' руб.';
            priceGrehSpan.title = 'Двойной клик — изменить цену (Грех)';

            const priceDolgSpan = document.createElement('span');
            priceDolgSpan.className = 'mutant-price-dolg';
            priceDolgSpan.textContent = 'Долг: ' + part.dolgPrice + ' руб.';
            priceDolgSpan.title = 'Двойной клик — изменить цену (Долг)';

            priceDiv.appendChild(priceGrehSpan);
            priceDiv.appendChild(priceDolgSpan);

            itemDiv.appendChild(nameDiv);
            itemDiv.appendChild(imgButton);
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
            mutantQuantityElements.set(part.name, quantitySpan);

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
                mutantTotalSumGreh += actualDelta * part.grehPrice;
                mutantTotalSumDolg += actualDelta * part.dolgPrice;
                updateMutantTotals();
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
                    const currentQty = parseInt(quantitySpan.textContent);
                    if (currentQty > 0) {
                        mutantTotalSumGreh -= currentQty * part.grehPrice;
                        mutantTotalSumDolg -= currentQty * part.dolgPrice;
                        quantitySpan.textContent = '0';
                        SC.updateItemSelectedState(itemDiv, 0);
                        updateMutantTotals();
                        scheduleMetrikaSend();
                    }
                }
            });

            itemDiv.addEventListener('contextmenu', (e) => e.preventDefault());

            function makePriceEditable(span, priceKey, labelText) {
                span.addEventListener('dblclick', () => {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'price-input';
                    input.value = part[priceKey];
                    input.min = '0';
                    input.step = '1';

                    span.textContent = '';
                    span.appendChild(input);
                    input.focus();

                    const saveNewPrice = () => {
                        const parsedPrice = parseInt(input.value, 10);
                        const newPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : part[priceKey];
                        part[priceKey] = newPrice;
                        span.textContent = labelText + ': ' + newPrice + ' руб.';

                        recalcTotalsFromQuantities();
                        updateMutantTotals();
                        saveMutantPricesToStorage();
                        scheduleMetrikaSend();
                    };

                    input.addEventListener('blur', saveNewPrice);
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') saveNewPrice();
                    });
                });
            }

            makePriceEditable(priceGrehSpan, 'grehPrice', 'Грех');
            makePriceEditable(priceDolgSpan, 'dolgPrice', 'Долг');

            buttonGroup.appendChild(subBtn);
            buttonGroup.appendChild(quantitySpan);
            buttonGroup.appendChild(addBtn);
            controlsDiv.appendChild(buttonGroup);
            itemDiv.appendChild(controlsDiv);
            mutantCards.set(part.name, itemDiv);
            mutantButtonsContainer.appendChild(itemDiv);
        }

        mutantSearchInput.addEventListener('input', updateMutantList);

        mutantBonusButtons.forEach(btn => btn.addEventListener('click', () => {
            mutantBonusButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMutantBonus = parseInt(btn.dataset.bonus);
            updateMutantTotals();
            scheduleMetrikaSend();
        }));

        document.getElementById('mutantResetBtn').addEventListener('click', () => {
            mutantTotalSumGreh = 0;
            mutantTotalSumDolg = 0;
            currentMutantBonus = 0;
            mutantBonusButtons.forEach(b => b.classList.remove('active'));
            mutantBonusButtons[0].classList.add('active');
            mutantQuantityElements.forEach(span => span.textContent = '0');
            mutantCards.forEach(card => SC.updateItemSelectedState(card, 0));
            mutantSearchInput.value = '';
            updateMutantList();
            updateMutantTotals();
            metrikaSender.cancel();
        });

        mutantTotalDisplayGreh.addEventListener('click', (e) => SC.copyToClipboard(mutantTotalSumGreh.toString(), e));
        mutantTotalDisplayDolg.addEventListener('click', (e) => SC.copyToClipboard(mutantTotalSumDolg.toString(), e));
        mutantFinalDisplayGreh.addEventListener('click', (e) => SC.copyToClipboard(Math.round(mutantTotalSumGreh * (1 - currentMutantBonus / 100)).toString(), e));
        mutantFinalDisplayDolg.addEventListener('click', (e) => SC.copyToClipboard(Math.round(mutantTotalSumDolg * (1 - currentMutantBonus / 100)).toString(), e));

        mutantParts.forEach(p => createMutantButton(p));
        mutantBonusButtons[0].classList.add('active');
    };
})();
