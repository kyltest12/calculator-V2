(function () {
    "use strict";

    const SC = window.StalkerCalc;

    SC.initTraderItems = function (traderData) {
        const items = (traderData.items || []).map(item => ({
            name: item.name,
            category: item.category,
            purchasePrice: Number(item.purchasePrice) || 0,
            salePrice: Number(item.salePrice) || 0
        }));
        const searchInput = document.getElementById('traderSearchInput');
        const categorySelect = document.getElementById('traderCategorySelect');
        const buttonsContainer = document.getElementById('traderButtonsContainer');
        const purchaseTotalDisplay = document.getElementById('traderPurchaseTotal');
        const saleTotalDisplay = document.getElementById('traderSaleTotal');
        const purchaseFinalDisplay = document.getElementById('traderPurchaseFinal');
        const saleFinalDisplay = document.getElementById('traderSaleFinal');
        const bonusButtons = document.querySelectorAll('.trader-bonus-btn');
        const resetBtn = document.getElementById('traderResetBtn');
        const quantities = new Map();
        const cards = new Map();
        let purchaseTotal = 0;
        let saleTotal = 0;
        let currentBonus = 0;

        SC.setupSectionAccess('traders', [
            document.querySelector('.trader-title'),
            document.querySelector('.trader-section')
        ]);

        [...new Set(items.map(item => item.category))].forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        function updateTotals() {
            const finalPurchase = Math.round(purchaseTotal * (1 + currentBonus / 100));
            const finalSale = Math.round(saleTotal * (1 + currentBonus / 100));
            purchaseTotalDisplay.textContent = purchaseTotal.toLocaleString('ru-RU');
            saleTotalDisplay.textContent = saleTotal.toLocaleString('ru-RU');
            purchaseFinalDisplay.textContent = finalPurchase.toLocaleString('ru-RU');
            saleFinalDisplay.textContent = finalSale.toLocaleString('ru-RU');
        }

        function updateList() {
            const term = searchInput.value.toLowerCase().trim();
            const category = categorySelect.value;
            cards.forEach((card, name) => {
                const item = items.find(entry => entry.name === name);
                const matchesTerm = !term || name.toLowerCase().includes(term);
                const matchesCategory = !category || item.category === category;
                card.classList.toggle('hidden', !matchesTerm || !matchesCategory);
            });
        }

        function createCard(item) {
            const card = document.createElement('div');
            card.className = 'item trader-item';

            const name = document.createElement('div');
            name.className = 'item-name';
            name.textContent = item.name;

            const category = document.createElement('div');
            category.className = 'trader-item-category';
            category.textContent = item.category;

            const price = document.createElement('div');
            price.className = 'price trader-item-price';
            price.innerHTML = `Закупка: ${item.purchasePrice.toLocaleString('ru-RU')}<br>Цена: ${item.salePrice.toLocaleString('ru-RU')}`;

            const controls = document.createElement('div');
            controls.className = 'controls';
            const group = document.createElement('div');
            group.className = 'button-group';
            const decrease = document.createElement('button');
            decrease.type = 'button';
            decrease.className = 'btn-control';
            decrease.textContent = '−';
            const quantity = document.createElement('div');
            quantity.className = 'quantity';
            quantity.textContent = '0';
            const increase = document.createElement('button');
            increase.type = 'button';
            increase.className = 'btn-control';
            increase.textContent = '+';
            quantities.set(item.name, quantity);

            const updateQuantity = (delta) => {
                const previous = Number(quantity.textContent);
                const next = Math.max(0, previous + delta);
                const actualDelta = next - previous;
                if (!actualDelta) return;
                quantity.textContent = String(next);
                SC.updateItemSelectedState(card, next);
                purchaseTotal += actualDelta * item.purchasePrice;
                saleTotal += actualDelta * item.salePrice;
                updateTotals();
            };
            decrease.addEventListener('click', () => updateQuantity(-1));
            increase.addEventListener('click', () => updateQuantity(1));

            group.append(decrease, quantity, increase);
            controls.appendChild(group);
            card.append(name, category, price, controls);
            cards.set(item.name, card);
            buttonsContainer.appendChild(card);
        }

        searchInput.addEventListener('input', updateList);
        categorySelect.addEventListener('change', updateList);
        bonusButtons.forEach(button => button.addEventListener('click', () => {
            bonusButtons.forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            currentBonus = Number(button.dataset.bonus);
            updateTotals();
        }));
        resetBtn.addEventListener('click', () => {
            purchaseTotal = 0;
            saleTotal = 0;
            currentBonus = 0;
            searchInput.value = '';
            categorySelect.value = '';
            bonusButtons.forEach(button => button.classList.remove('active'));
            bonusButtons[0].classList.add('active');
            quantities.forEach(quantity => { quantity.textContent = '0'; });
            cards.forEach(card => SC.updateItemSelectedState(card, 0));
            cards.forEach(card => card.classList.remove('hidden'));
            updateTotals();
        });
        purchaseTotalDisplay.addEventListener('click', event => SC.copyToClipboard(String(purchaseTotal), event));
        saleTotalDisplay.addEventListener('click', event => SC.copyToClipboard(String(saleTotal), event));
        purchaseFinalDisplay.addEventListener('click', event => SC.copyToClipboard(String(Math.round(purchaseTotal * (1 + currentBonus / 100))), event));
        saleFinalDisplay.addEventListener('click', event => SC.copyToClipboard(String(Math.round(saleTotal * (1 + currentBonus / 100))), event));

        items.forEach(createCard);
        bonusButtons[0].classList.add('active');
        updateTotals();
    };
})();
