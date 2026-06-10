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
            price: part.price,
            image: getLocalMutantImagePath(part.name)
        }));

        if (savedMutantPrices) {
            try {
                const prices = JSON.parse(savedMutantPrices);
                if (prices && !Array.isArray(prices) && typeof prices === 'object') {
                    mutantParts.forEach(part => {
                        const savedPrice = prices[part.name];
                        if (Number.isFinite(savedPrice) && savedPrice >= 0) {
                            part.price = savedPrice;
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
            const prices = Object.fromEntries(mutantParts.map(part => [part.name, part.price]));
            localStorage.setItem('mutantPartPrices', JSON.stringify(prices));
        }

        const mutantTotalDisplay = document.getElementById('mutantTotalSum');
        const mutantFinalDisplay = document.getElementById('mutantFinalSum');
        const mutantBonusButtons = document.querySelectorAll('.mutant-bonus-btn');
        const mutantSearchInput = document.getElementById('mutantSearchInput');
        const mutantButtonsContainer = document.getElementById('mutantButtonsContainer');
        let mutantTotalSum = 0;
        let currentMutantBonus = 0;
        const mutantQuantityElements = new Map();
        const mutantCards = new Map();

        SC.setupSectionAccess('mutants', [
            document.querySelector('.mutant-title'),
            document.querySelector('.mutant-section')
        ]);

        function updateMutantTotals() {
            mutantTotalDisplay.textContent = mutantTotalSum.toLocaleString('ru-RU');
            mutantFinalDisplay.textContent = Math.round(mutantTotalSum * (1 - currentMutantBonus / 100)).toLocaleString('ru-RU');
        }

        function updateMutantList() {
            const searchTerm = mutantSearchInput.value.toLowerCase().trim();
            mutantCards.forEach((card, name) => {
                const matches = searchTerm === '' || name.toLowerCase().includes(searchTerm);
                card.classList.toggle('hidden', !matches);
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
            priceDiv.textContent = part.price + ' руб.';

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
                mutantTotalSum += actualDelta * part.price;
                updateMutantTotals();
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
                        mutantTotalSum -= currentQty * part.price;
                        quantitySpan.textContent = '0';
                        SC.updateItemSelectedState(itemDiv, 0);
                        updateMutantTotals();
                    }
                }
            });

            itemDiv.addEventListener('contextmenu', (e) => e.preventDefault());

            priceDiv.addEventListener('dblclick', () => {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'price-input';
                input.value = part.price;
                input.min = '0';
                input.step = '1';

                priceDiv.textContent = '';
                priceDiv.appendChild(input);
                input.focus();

                const saveNewPrice = () => {
                    const parsedPrice = parseInt(input.value, 10);
                    const newPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : part.price;
                    part.price = newPrice;
                    priceDiv.textContent = newPrice + ' руб.';

                    mutantTotalSum = Array.from(mutantQuantityElements.entries()).reduce((sum, [name, span]) => {
                        const mutantPart = mutantParts.find(item => item.name === name);
                        return sum + (parseInt(span.textContent) * mutantPart.price);
                    }, 0);

                    updateMutantTotals();
                    saveMutantPricesToStorage();
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
            mutantCards.set(part.name, itemDiv);
            mutantButtonsContainer.appendChild(itemDiv);
        }

        mutantSearchInput.addEventListener('input', updateMutantList);

        mutantBonusButtons.forEach(btn => btn.addEventListener('click', () => {
            mutantBonusButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMutantBonus = parseInt(btn.dataset.bonus);
            updateMutantTotals();
        }));

        document.getElementById('mutantResetBtn').addEventListener('click', () => {
            mutantTotalSum = 0;
            currentMutantBonus = 0;
            mutantBonusButtons.forEach(b => b.classList.remove('active'));
            mutantBonusButtons[0].classList.add('active');
            mutantQuantityElements.forEach(span => span.textContent = '0');
            mutantCards.forEach(card => SC.updateItemSelectedState(card, 0));
            mutantSearchInput.value = '';
            updateMutantList();
            updateMutantTotals();
        });

        mutantTotalDisplay.addEventListener('click', (e) => SC.copyToClipboard(mutantTotalSum.toString(), e));
        mutantFinalDisplay.addEventListener('click', (e) => SC.copyToClipboard(Math.round(mutantTotalSum * (1 - currentMutantBonus / 100)).toString(), e));

        mutantParts.forEach(p => createMutantButton(p));
        mutantBonusButtons[0].classList.add('active');
    };
})();
