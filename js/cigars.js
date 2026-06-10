(function () {
    "use strict";

    const SC = window.StalkerCalc;

    SC.initCigars = function (cigarsData) {
        const cigars = cigarsData.map(item => ({ name: item.name, price: item.price }));

        const cigarTotalDisplay = document.getElementById('cigarTotalSum');
        const cigarFinalDisplay = document.getElementById('cigarFinalSum');
        const cigarBonusButtons = document.querySelectorAll('.cigar-bonus-btn');
        const cigarResetBtn = document.getElementById('cigarResetBtn');
        const cigarSearchInput = document.getElementById('cigarSearchInput');
        const cigarButtonsContainer = document.getElementById('cigarButtonsContainer');
        const cigarQuantityElements = new Map();
        const cigarCards = new Map();
        let cigarTotalSum = 0;
        let currentCigarBonus = 0;

        SC.setupSectionAccess('cigars', [
            document.querySelector('.cigar-title'),
            document.querySelector('.cigar-section')
        ]);

        function updateCigarTotals() {
            cigarTotalDisplay.textContent = cigarTotalSum.toLocaleString('ru-RU');
            cigarFinalDisplay.textContent = Math.round(cigarTotalSum * (1 + currentCigarBonus / 100)).toLocaleString('ru-RU');
        }

        function createCigarButton(cigar) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item cigar-item';
            itemDiv.dataset.cigarName = cigar.name.toLowerCase();

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = cigar.name;

            const priceDiv = document.createElement('div');
            priceDiv.className = 'price';
            priceDiv.textContent = cigar.price + ' руб.';

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
            cigarQuantityElements.set(cigar.name, quantitySpan);

            const addBtn = document.createElement('button');
            addBtn.className = 'btn-control';
            addBtn.textContent = '+';

            const updateQuantity = (delta) => {
                const currentQty = parseInt(quantitySpan.textContent, 10);
                const nextQty = Math.max(0, currentQty + delta);
                const actualDelta = nextQty - currentQty;

                if (actualDelta === 0) return;

                quantitySpan.textContent = String(nextQty);
                SC.updateItemSelectedState(itemDiv, nextQty);
                cigarTotalSum += actualDelta * cigar.price;
                updateCigarTotals();
            };

            addBtn.addEventListener('click', () => updateQuantity(1));
            subBtn.addEventListener('click', () => updateQuantity(-1));

            buttonGroup.appendChild(subBtn);
            buttonGroup.appendChild(quantitySpan);
            buttonGroup.appendChild(addBtn);
            controlsDiv.appendChild(buttonGroup);

            itemDiv.appendChild(nameDiv);
            itemDiv.appendChild(priceDiv);
            itemDiv.appendChild(controlsDiv);
            cigarCards.set(cigar.name, itemDiv);
            cigarButtonsContainer.appendChild(itemDiv);
        }

        cigarSearchInput.addEventListener('input', () => {
            const searchTerm = cigarSearchInput.value.toLowerCase().trim();
            cigarCards.forEach((item, name) => {
                const cigarName = name.toLowerCase();
                item.classList.toggle('hidden', searchTerm !== '' && !cigarName.includes(searchTerm));
            });
        });

        cigarBonusButtons.forEach(btn => btn.addEventListener('click', () => {
            cigarBonusButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCigarBonus = parseInt(btn.dataset.bonus, 10);
            updateCigarTotals();
        }));

        cigarResetBtn.addEventListener('click', () => {
            cigarTotalSum = 0;
            currentCigarBonus = 0;
            cigarBonusButtons.forEach(b => b.classList.remove('active'));
            cigarBonusButtons[0].classList.add('active');
            cigarQuantityElements.forEach(span => {
                span.textContent = '0';
            });
            cigarCards.forEach(card => SC.updateItemSelectedState(card, 0));
            cigarSearchInput.value = '';
            cigarCards.forEach(card => card.classList.remove('hidden'));
            updateCigarTotals();
        });

        cigarTotalDisplay.addEventListener('click', (e) => SC.copyToClipboard(cigarTotalSum.toString(), e));
        cigarFinalDisplay.addEventListener('click', (e) => SC.copyToClipboard(Math.round(cigarTotalSum * (1 + currentCigarBonus / 100)).toString(), e));

        cigars.forEach(cigar => createCigarButton(cigar));
        cigarBonusButtons[0].classList.add('active');
    };
})();
