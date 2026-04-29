(function(){
    "use strict";

    // === ПРИВЕТСТВЕННОЕ СООБЩЕНИЕ ПРИ ПЕРВОМ ЗАХОДЕ ===
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    if (!hasVisited) {
        const welcomeOverlay = document.createElement('div');
        welcomeOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center;
            align-items: center; z-index: 99999; opacity: 0; transition: opacity 0.3s ease;
        `;
        
        const welcomeBox = document.createElement('div');
        welcomeBox.style.cssText = `
            background: linear-gradient(135deg, var(--bg-header) 0%, var(--bg-header2) 100%);
            color: white; padding: 30px; border-radius: 12px; max-width: 500px;
            text-align: center; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 2px solid var(--border-accent); transform: scale(0.9);
            transition: transform 0.3s ease;
        `;
        
        welcomeBox.innerHTML = `
            <div style="font-size: 60px; margin-bottom: 15px;">💎</div>
            <p style="margin-bottom: 10px; font-size: 16px;">Это калькулятор для подсчёта стоимости артефактов и частей мутантов.</p>
            <p style="margin-bottom: 20px; font-size: 14px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
                🎮 <strong>Горячие клавиши:</strong><br>
                • Клик по картинке — добавить 1 шт.<br>
                • Shift + клик / ПКМ — убрать 1 шт.<br>
                • Средняя кнопка мыши — сбросить артефакт<br>
                • Двойной клик по цене — изменить цену<br>
                • Наведение на артефакт — показать свойства
            </p>
            <button id="welcomeCloseBtn" style="
                background: white; color: var(--bg-header2); border: none; padding: 12px 30px;
                border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer;
                transition: all 0.2s; border: 2px solid transparent;
            ">Понятно</button>
        `;
        
        welcomeOverlay.appendChild(welcomeBox);
        document.body.appendChild(welcomeOverlay);
        
        setTimeout(() => {
            welcomeOverlay.style.opacity = '1';
            welcomeBox.style.transform = 'scale(1)';
        }, 10);
        
        const closeBtn = welcomeBox.querySelector('#welcomeCloseBtn');
        closeBtn.addEventListener('click', () => {
            welcomeOverlay.style.opacity = '0';
            welcomeBox.style.transform = 'scale(0.9)';
            setTimeout(() => welcomeOverlay.remove(), 300);
            localStorage.setItem('hasVisitedBefore', 'true');
        });
        
        welcomeOverlay.addEventListener('click', (e) => {
            if (e.target === welcomeOverlay) {
                welcomeOverlay.style.opacity = '0';
                welcomeBox.style.transform = 'scale(0.9)';
                setTimeout(() => welcomeOverlay.remove(), 300);
                localStorage.setItem('hasVisitedBefore', 'true');
            }
        });
        
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                welcomeOverlay.style.opacity = '0';
                welcomeBox.style.transform = 'scale(0.9)';
                setTimeout(() => welcomeOverlay.remove(), 300);
                localStorage.setItem('hasVisitedBefore', 'true');
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'var(--border-accent)';
            closeBtn.style.color = 'white';
            closeBtn.style.transform = 'scale(1.05)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'white';
            closeBtn.style.color = 'var(--bg-header2)';
            closeBtn.style.transform = 'scale(1)';
        });
    }

    // === ХРАНЕНИЕ ДАННЫХ АРТЕФАКТОВ ===
    let artifacts = [
        { name: 'Бенгальский огонь', price: 1500, image: '',
          properties: { 'Радиация': '-0.06 мк3в/сек', 'Электрошок': '+10%' } },
        { name: 'Ломоть мяса', price: 1550, image: 'https://static.wikia.nocookie.net/stalker/images/a/ac/Icon_SoC_artefact_mincer_meat.png/revision/latest?cb=20230723224233&path-prefix=[...]
          properties: { 'Гашение урона': '-1%', 'Защита от разрыва': '+5%', 'Радиация': '-0.08 мк3в/сек', 'Химический ожог': '+10%' } },
        { name: 'Кристалл', price: 1650, image: 'https://i.imgur.com/FDiTRln.png',
          properties: { 'Насыщение': '+2%', 'Ожог': '+5%', 'Радиация': '-0.15 мк3в/сек' } },
        { name: 'Батарейка', price: 1750, image: 'https://static.wikia.nocookie.net/stalker/images/9/92/%D0%91%D0%B0%D1%82%D0%B0%D1%80%D0%B5%D0%B9%D0%BA%D0%B0%28ico%29_cop.png/revision/la[...]
          properties: { 'Защита от разрыва': '-2%', 'Электрошок': '+10%' } },
        { name: 'Каменный цветок', price: 1850, image: 'https://static.wikia.nocookie.net/stalker/images/d/d5/%D0%9A%D0%B0%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9_%D1%86%D0%B2%D0%B5%D1%8[...]
          properties: { 'Гашение урона': '+3%', 'Радиация': '-0.07 мк3в/сек' } },
        { name: 'Кровь камня', price: 1900, image: 'https://i.imgur.com/LFb6IWv.png',
          properties: { 'Гашение урона': '+2%', 'Защита от разрыва': '-3%', 'Радиация': '-0.09 мк3в/сек', 'Регенерация': '+3%' } },
        { name: 'Слеза', price: 1950, image: 'https://static.wikia.nocookie.net/modistalker/images/b/b2/%D0%A1%D0%BB%D0%B5%D0%B7%D0%B0_%D0%98%D0%BA%D0%BE%D0%BD%D0%BA%D0%B0.png/revision/lates[...]
          properties: { 'Насыщение': '+2%', 'Ожог': '+10%', 'Радиация': '-0.1 мк3в/сек' } },
        { name: 'Медуза', price: 2150, image: 'https://static.wikia.nocookie.net/stalker/images/2/2e/Icon_SoC_artefact_medusa.png/revision/latest?cb=20230723224834&path-prefix=ru',
          properties: { 'Гашение урона': '-3%', 'Защита от разрыва': '+7%', 'Радиация': '+0.05 мк3в/сек' } },
        { name: 'Линза', price: 2150, image: 'https://static.wikia.nocookie.net/modistalker/images/c/ce/%D0%9B%D0%B8%D0%BD%D0%B7%D0%B0_%D0%98%D0%BA%D0%BE%D0%BD%D0%BA%D0%B0.png/revision/lates[...]
          properties: { 'Гашение урона': '+5%', 'Защита от разрыва': '+4%', 'Радиация': '-0.06 мк3в/сек' } },
        { name: 'Изменный Изолятор', price: 2200, image: 'https://static.wikia.nocookie.net/stalker/images/4/4c/%D0%98%D0%B7%D0%BC%D0%B5%D0%BD%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9_%D0%B8[...]
          properties: { 'Ожог': '+5%', 'Радиация': '-0.12 мк3в/сек', 'Химический ожог': '+5%', 'Электрошок': '+5%' } },
        { name: 'Мамины бусы', price: 2300, image: 'https://static.wikia.nocookie.net/stalker/images/0/09/%D0%9C%D0%B0%D0%BC%D0%B8%D0%BD%D1%8B_%D0%B1%D1%83%D1%81%D1%8B%28ico%29_cop.png/[...]
          properties: { 'Гашение урона': '+2%', 'Насыщение': '+2%', 'Радиация': '-0.03 мк3в/сек' } },
        { name: 'Лунный свет', price: 2400, image: 'https://static.wikia.nocookie.net/stalker/images/a/a0/%D0%9B%D1%83%D0%BD%D0%BD%D1%8B%D0%B9_%D1%81%D0%B2%D0%B5%D1%82%28ico%29_cop.png/[...]
          properties: { 'Радиация': '-0.03 мк3в/сек', 'Регенерация': '+3%', 'Электрошок': '-10%' } },
        { name: 'Выверт', price: 2800, image: 'https://i.imgur.com/ggVL5xI.png',
          properties: { 'Защита от разрыва': '-2%', 'Радиация': '+0.11 мк3в/сек' } },
        { name: 'Кисель', price: 3150, image: 'https://i.imgur.com/bY8i6ri.png',
          properties: { 'Гашение урона': '-1%', 'Радиация': '+0.2 мк3в/сек', 'Химический ожог': '+15%' } },
        { name: 'Слизняк', price: 3350, image: 'https://i.imgur.com/AG7a1VR.png',
          properties: { 'Ожог': '-10%', 'Регенерация': '+2%', 'Химический ожог': '-10%' } },
        { name: 'Огненный шар', price: 3450, image: 'https://static.wikia.nocookie.net/stalker/images/6/6d/Icon_SoC_artefact_fireball.png/revision/latest?cb=20230723224019&path-prefix=[...]
          properties: { 'Ожог': '+30%', 'Радиация': '-0.06 мк3в/сек' } },
        { name: 'Ночная звезда', price: 3550, image: 'https://static.wikia.nocookie.net/stalker/images/9/99/%D0%9D%D0%BE%D1%87%D0%BD%D0%B0%D1%8F_%D0%B7%D0%B2%D0%B5%D0%B7%D0%B4%D0%B0%2[...]
          properties: { 'Гашение урона': '+3%', 'Защита от разрыва': '+4%', 'Радиация': '-0.19 мк3в/сек' } },
        { name: 'Смола', price: 3625, image: 'https://static.wikia.nocookie.net/modistalker/images/0/06/%D0%A1%D0%BC%D0%BE%D0%BB%D0%B0_%D0%98%D0%BA%D0%BE%D0%BD%D0%BA%D0%B0.png/revision/lates[...]
          properties: { 'Ожог': '-5%', 'Радиация': '-0.08 мк3в/сек', 'Регенерация': '+2%', 'Химический ожог': '-5%' } },
        { name: 'Пустышка', price: 3700, image: 'https://static.wikia.nocookie.net/stalker/images/d/df/%D0%9F%D1%83%D1%81%D1%82%D1%8B%D1%88%D0%BA%D0%B0%28ico%29_cop.png/revision/latest?cb[...]
          properties: { 'Гашение урона': '-3%', 'Насыщение': '+2%', 'Ожог': '+15%' } },
        { name: 'Медальон', price: 3750, image: 'https://static.wikia.nocookie.net/modistalker/images/c/cb/Icon_%D0%9C%D0%B5%D0%B4%D0%B0%D0%BB%D1%8C%D0%BE%D0%BD_%D0%9F%D1%83%D1%82%D1%8C%D[...]
          properties: { 'Гашение урона': '+3%', 'Защита от разрыва': '-1%', 'Радиация': '-0.06 мк3в/сек', 'Регенерация': '+1%' } },
        { name: 'Глаз', price: 4000, image: 'https://static.wikia.nocookie.net/stalker/images/5/5f/%D0%93%D0%BB%D0%B0%D0%B7%28ico%29.png/revision/latest?cb=20120226183639&path-prefix=ru',
          properties: { 'Гашение урона': '+3%', 'Радиация': '-0.1 мк3в/сек' } },
        { name: 'Глаз дьявола', price: 4200, image: 'https://i.imgur.com/cQqpFpB.png',
          properties: { 'Защита от разрыва': '-3%', 'Электрошок': '+15%' } },
        { name: 'Грави', price: 4250, image: 'https://static.wikia.nocookie.net/stalker/images/d/dd/Icon_SoC_artefact_gravi.png/revision/latest?cb=20230723224441&path-prefix=ru',
          properties: { 'Защита от разрыва': '+4%', 'Радиация': '-0.08 мк3в/сек' } },
        { name: 'Душа', price: 4500, image: 'https://static.wikia.nocookie.net/stalker/images/7/74/%D0%94%D1%83%D1%88%D0%B0%28ico%29_cop.png/revision/latest?cb=20120226184241&path-prefix=ru',
          properties: { 'Гашение урона': '-3%', 'Защита от разрыва': '+4%', 'Радиация': '-0.12 мк3в/сек', 'Регенерация': '+3%' } },
        { name: 'Призрачная Звезда', price: 4800, image: 'https://i.imgur.com/mxi3kZ7.png',
          properties: { 'Радиация': '-0.06 мк3в/сек', 'Электрошок': '+35%' } },
        { name: 'Вспышка', price: 4950, image: 'https://static.wikia.nocookie.net/stalker/images/c/c1/Icon_SoC_artefact_electra_flash.png/revision/latest?cb=20230722122822&path-prefix=ru',
          properties: { 'Выносливость': '+0.5%', 'Радиация': '-0.07 мк3в/сек', 'Электрошок': '+30%' } },
        { name: 'Колобок', price: 5250, image: 'https://static.wikia.nocookie.net/stalker/images/9/93/%D0%9A%D0%BE%D0%BB%D0%BE%D0%B1%D0%BE%D0%BA%28ico%29_cop.png/revision/latest?cb=2012022[...]
          properties: { 'Радиация': '-0.09 мк3в/сек', 'Регенерация': '+3%' } },
        { name: 'Серафим', price: 5750, image: 'https://static.wikia.nocookie.net/modistalker/images/8/84/%D0%A1%D0%B5%D1%80%D0%B0%D1%84%D0%B8%D0%BC_Gamma_icon.png/revision/latest?cb=20240[...]
          properties: { 'Гашение урона': '-5%', 'Защита от разрыва': '+5%', 'Ожог': '+15%', 'Радиация': '-0.15 мк3в/сек', 'Регенерация': '+[...]
        { name: 'Пузырь', price: 6000, image: 'https://static.wikia.nocookie.net/stalker/images/f/fa/%D0%9F%D1%83%D0%B7%D1%8B%D1%80%D1%8C%28ico%29.png/revision/latest?cb=20120226195034&path[...]
          properties: { 'Гашение урона': '-2%', 'Радиация': '+0.19 мк3в/сек' } },
        { name: 'Губка', price: 7200, image: 'https://i.imgur.com/mAVnKNq.png',
          properties: { 'Гашение урона': '+4%', 'Защита от разрыва': '+10%', 'Радиация': '-0.1 мк3в/сек', 'Регенерация': '+2%', 'Химичес[...]
        { name: 'Снежинка', price: 7250, image: 'https://static.wikia.nocookie.net/stalker/images/0/0b/%D0%A1%D0%BD%D0%B5%D0%B6%D0%B8%D0%BD%D0%BA%D0%B0%28ico%29.png/revision/latest?cb=201[...]
          properties: { 'Ожог': '+5%', 'Радиация': '-0.77 мк3в/сек', 'Электрошок': '+5%' } },
        { name: 'Солнце', price: 7500, image: 'https://i.imgur.com/qLuSjXC.png',
          properties: { 'Ожог': '+35%', 'Радиация': '-0.177 мк3в/сек', 'Химический ожог': '+10%' } },
        { name: 'Светляк', price: 8200, image: 'https://static.wikia.nocookie.net/stalker/images/9/9b/%D0%A1%D0%B2%D0%B5%D1%82%D0%BB%D1%8F%D0%BA%28ico%29.png/revision/latest?cb=20120226195[...]
          properties: { 'Гашение урона': '-2%', 'Защита от разрыва': '-3%', 'Регенерация': '+5%' } },
        { name: 'Пламя', price: 8600, image: 'https://i.imgur.com/O4uOCrR.png',
          properties: { 'Гашение урона': '+4%', 'Ожог': '+40%', 'Радиация': '-0.1 мк3в/сек', 'Химический ожог': '+15%' } },
        { name: 'Компас', price: 12150, image: 'https://static.wikia.nocookie.net/stalker/images/6/65/%D0%9A%D0%BE%D0%BC%D0%BF%D0%B0%D1%81%28ico%29.png/revision/latest?cb=20120226190302&pat[...]
          properties: { 'Выносливость': '+0.75%', 'Ожог': '+15%', 'Радиация': '-0.08 мк3в/сек', 'Химический ожог': '+15%', 'Электрошок': '+15[...]
        { name: 'Золотая Рыбка', price: 12500, image: 'https://i.imgur.com/RCN1fBo.png',
          properties: { 'Гашение урона': '+5%', 'Защита от разрыва': '-2%', 'Радиация': '-0.12 мк3в/сек' } },
        { name: 'Мертвое сердце', price: 13075, image: 'https://i.imgur.com/SdMv47l.png',
          properties: { 'Гашение урона': '+7%', 'Защита от разрыва': '-10%', 'Радиация': '-0.06 мк3в/сек', 'Химический ожог': '+15%', 'Эл[...]
        { name: 'Светлый дом', price: 13750, image: 'https://i.imgur.com/QIDPOiN.png',
          properties: { 'Гашение урона': '-5%', 'Защита от разрыва': '-5%', 'Насыщение': '+4%', 'Радиация': '-0.02 мк3в/сек', 'Регенерац[...]
        { name: 'Изменный Штурвал', price: 50000, image: 'https://static.wikia.nocookie.net/stalker/images/f/f9/%D0%98%D0%B7%D0%BC%D0%B5%D0%BD%D1%91%D0%BD%D0%BD%D1%8B%D0%B9_%D1%88%[...]
          properties: { 'Гашение урона': '+5%', 'Насыщение': '+4%', 'Радиация': '-0.1 мк3в/сек', 'Регенерация': '+3%' } },
        { name: 'Сердце Оазиса', price: 75000, image: 'https://static.wikia.nocookie.net/stalker/images/f/f8/%D0%A1%D0%B5%D1%80%D0%B4%D1%86%D0%B5_%D0%9E%D0%B0%D0%B7%D0%B8%D1%81%D0%B0%[...]
          properties: { 'Защита от разрыва': '+7%', 'Насыщение': '+7%', 'Радиация': '-0.07 мк3в/сек', 'Регенерация': '+3%' } },
        { name: 'Атом', price: 100000, image: 'https://i.imgur.com/5Tj2WFP.png',
          properties: { 'Выносливость': '+1%', 'Гашение урона': '+10%', 'Защита от разрыва': '-10%', 'Ожог': '+15%', 'Радиация': '-0.12 мк3в/[...]
    ];

    // Загрузка сохранённых цен
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

    const savedMutantPrices = localStorage.getItem('mutantPartPrices');

    // === ТЕМНАЯ ТЕМА ===
    const themeToggle = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
    }
    
    function updateThemeIcon() {
        const isDark = htmlElement.getAttribute('data-theme') === 'dark';
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            htmlElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
        updateThemeIcon();
    });
    
    updateThemeIcon();

    // === ТУЛТИП С СВОЙСТВАМИ АРТЕФАКТА ===
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

    // Вспомогательная функция копирования
    function copyToClipboard(text, event) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const copyTooltip = document.createElement('div');
            copyTooltip.className = 'copy-tooltip';
            copyTooltip.textContent = 'Скопировано!';
            document.body.appendChild(copyTooltip);
            copyTooltip.style.left = (event.clientX + 15) + 'px';
            copyTooltip.style.top = (event.clientY - 30) + 'px';
            copyTooltip.style.opacity = '1';
            setTimeout(() => {
                copyTooltip.style.opacity = '0';
                setTimeout(() => copyTooltip.remove(), 200);
            }, 800);
        }).catch(err => {
            alert('Не удалось скопировать: ' + err);
        });
    }

    // === КАЛЬКУЛЯТОР АРТЕФАКТОВ ===
    const totalDisplay = document.getElementById('totalSum');
    const finalDisplay = document.getElementById('finalSum');
    const bonusButtons = document.querySelectorAll('.header-stats .bonus-btn');
    const resetBtn = document.getElementById('resetBtn');
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportBtn');

    let totalSum = 0;
    let currentBonus = 0;
    const quantityElements = new Map();
    const artifactImageFolder = 'артефакты V2';
    const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="70" height="70"%3E%3Crect fill="white" width="70" height="70"/%3E%3C/svg%3E';

    function getLocalArtifactImagePath(name) {
        return `${artifactImageFolder}/${encodeURIComponent(name)}.png`;
    }

    artifacts.forEach((artifact) => {
        artifact.image = getLocalArtifactImagePath(artifact.name);
    });

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

        const nameDiv = document.createElement('div');
        nameDiv.className = 'item-name';
        nameDiv.textContent = artifact.name;
        itemDiv.appendChild(nameDiv);

        const imgButton = document.createElement('button');
        imgButton.className = 'image-button';
        const img = document.createElement('img');
        img.src = artifact.image;
        img.alt = artifact.name;
        img.onerror = function () { this.src = fallbackImage; };
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
                    updateTotals();
                }
            }
        });
        
        itemDiv.addEventListener('contextmenu', (e) => e.preventDefault());

        // Обработчики тултипа
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

        // Редактирование цены
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
        document.getElementById('buttonsContainer').appendChild(itemDiv);
    }

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('#buttonsContainer .item').forEach(item => {
            const name = item.dataset.artifactName;
            item.classList.toggle('hidden', term !== '' && !name.includes(term));
        });
    });

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
        searchInput.value = '';
        document.querySelectorAll('#buttonsContainer .item').forEach(i => i.classList.remove('hidden'));
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

    artifacts.forEach(a => createButton(a));
    bonusButtons[0].classList.add('active');

    // === МОДАЛЬНОЕ ОКНО НАСТРОЕК ===
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
        
        document.querySelectorAll('#buttonsContainer .price').forEach((priceDiv, index) => {
            if (index < artifacts.length) {
                priceDiv.textContent = artifacts[index].price + ' руб.';
            }
        });
        
        totalSum = Array.from(quantityElements.entries()).reduce((sum, [name, span]) => {
            const art = artifacts.find(a => a.name === name);
            return sum + (parseInt(span.textContent) * art.price);
        }, 0);
        updateTotals();
        
        savePricesToStorage();
        modal.style.display = 'none';
    });

    // === МУТАНТЫ ===
    const mutantTotalDisplay = document.getElementById('mutantTotalSum');
    const mutantFinalDisplay = document.getElementById('mutantFinalSum');
    const mutantBonusButtons = document.querySelectorAll('.mutant-bonus-btn');
    let mutantTotalSum = 0;
    let currentMutantBonus = 0;
    const mutantQuantityElements = new Map();
    const legacyMutantPrices = new Map([
        ['голова крысы', 475],
        ['голова тушкана', 1055],
        ['хвост собаки', 1165],
        ['глаз плоти', 1390],
        ['рука карлика', 1450],
        ['голова собаки', 1500],
        ['шкура собаки', 1525],
        ['хвост кошки', 1720],
        ['шкура плоти', 1720],
        ['голова собаки паразита', 1750],
        ['голова сабаки паразита', 1750],
        ['нога кабана', 2055],
        ['рука зомби', 2390],
        ['шкура кабана', 2400],
        ['рука излома', 2555],
        ['нога снорка', 2890],
        ['голова зомби паразита', 3000],
        ['рука коллектора', 3250],
        ['рука контролёра', 3250],
        ['маска снорка', 3250],
        ['крыло псевдоснорка', 3500],
        ['щупальца кровососа', 3310],
        ['щупальцы кровососа', 3310],
        ['рука полтергейста', 3400],
        ['хвост псевдособаки', 3500],
        ['шкура кровососа', 3710],
        ['шкура полтергейста', 3750],
        ['шкура псевдособаки', 4100],
        ['рука бюрера', 4310],
        ['коготь химеры', 5170],
        ['шкура химеры', 5750],
        ['рука псевдогиганта', 6610],
        ['шкура псевдогиганта', 7200]
    ]);
    const mutantPartNames = [
        'Голова Крысы',
        'Голова Тушкана',
        'Хвост Собаки',
        'Глаз Плоти',
        'Рука Карлика',
        'Голова Собаки',
        'Шкура Собаки',
        'Хвост Кошки',
        'Шкура Плоти',
        'Голова Собаки Паразита',
        'Нога Кабана',
        'Рука Зомби',
        'Шкура Кабана',
        'Рука Излома',
        'Нога Снорка',
        'Голова Зомби Паразита',
        'Рука Коллектора',
        'Маска Снорка',
        'Крыло Псевдоснорка',
        'Щупальца Кровососа',
        'Рука Полтергейста',
        'Хвост Псевдособаки',
        'Шкура Кровососа',
        'Шкура Полтергейста',
        'Шкура Псевдособаки',
        'Рука Бюрера',
        'Коготь Химеры',
        'Шкура Химеры',
        'Рука Псевдогиганта',
        'Шкура Псевдогиганта'
    ];
    const mutantImageFolder = 'мутанты';
    const mutantImageAliases = {
        'Глаз Плоти': 'Глаз плоти',
        'Голова Зомби Паразита': 'Голова зараженного зомби',
        'Голова Крысы': 'Голова крысы',
        'Голова Собаки': 'Голова собаки',
        'Голова Собаки Паразита': 'Голова Заражённой Собаки',
        'Голова Тушкана': 'Голова тушкана',
        'Хвост Собаки': 'Хвост собаки',
        'Коготь Химеры': 'Клык хименры',
        'Маска Снорка': 'Глова снорка',
        'Нога Кабана': 'Нога кабана',
        'Нога Снорка': 'Нога снорка',
        'Рука Бюрера': 'Рука буреры',
        'Рука Зомби': 'Рука зомби',
        'Рука Излома': 'Рука излома',
        'Рука Карлика': 'Рука карлика',
        'Рука Коллектора': 'Рука колектора',
        'Рука Полтергейста': 'Рука полтергейста',
        'Рука Псевдогиганта': 'Рука всевдогиганта',
        'Крыло Псевдоснорка': 'Крало снорка',
        'Хвост Кошки': 'Хвост кошки',
        'Хвост Псевдособаки': 'Хвост всевдособаки',
        'Шкура Кабана': 'Шкура кабана',
        'Шкура Кровососа': 'Шкура кровососа',
        'Шкура Полтергейста': 'Шкура полтергейста',
        'Шкура Псевдогиганта': 'Шкура всевдогигинта',
        'Шкура Псевдособаки': 'Шкура всевдособаки',
        'Шкура Собаки': 'Шкура собика',
        'Шкура Химеры': 'Шкура химеры',
        'Шкура Плоти': 'Шкура плоти',
        'Щупальца Кровососа': 'Шупальца кровососа'
    };

    function getLocalMutantImagePath(name) {
        const imageName = mutantImageAliases[name] || name;
        return `${mutantImageFolder}/${encodeURIComponent(imageName)}.png`;
    }

    const mutantPriceVersion = '2026-04-24';
    const savedMutantPriceVersion = localStorage.getItem('mutantPartPricesVersion');

    if (savedMutantPriceVersion !== mutantPriceVersion) {
        localStorage.removeItem('mutantPartPrices');
        localStorage.setItem('mutantPartPricesVersion', mutantPriceVersion);
    }

    const mutantParts = mutantPartNames.map(name => ({
        name,
        price: legacyMutantPrices.get(name.toLowerCase()) ?? 100,
        image: getLocalMutantImagePath(name)
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

    function updateMutantTotals() { 
        mutantTotalDisplay.textContent = mutantTotalSum.toLocaleString('ru-RU');
        mutantFinalDisplay.textContent = Math.round(mutantTotalSum * (1 - currentMutantBonus / 100)).toLocaleString('ru-RU');
    }

    function createMutantButton(part) {
        const itemDiv = document.createElement('div'); 
        itemDiv.className = 'item mutant-item';
        
        const nameDiv = document.createElement('div'); 
        nameDiv.className = 'item-name'; 
        nameDiv.textContent = part.name;

        const imgButton = document.createElement('button');
        imgButton.className = 'image-button';
        const img = document.createElement('img');
        img.src = part.image;
        img.alt = part.name;
        img.onerror = function () { this.src = fallbackImage; };
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
        document.getElementById('mutantButtonsContainer').appendChild(itemDiv);
    }

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
        updateMutantTotals();
    });

    mutantParts.forEach(p => createMutantButton(p));
    mutantBonusButtons[0].classList.add('active');

    // === СИГАРЫ ===
    const cigarTotalDisplay = document.getElementById('cigarTotalSum');
    const cigarFinalDisplay = document.getElementById('cigarFinalSum');
    const cigarBonusButtons = document.querySelectorAll('.cigar-bonus-btn');
    const cigarResetBtn = document.getElementById('cigarResetBtn');
    const cigarSearchInput = document.getElementById('cigarSearchInput');
    const cigarButtonsContainer = document.getElementById('cigarButtonsContainer');
    const cigarQuantityElements = new Map();
    let cigarTotalSum = 0;
    let currentCigarBonus = 0;

    const cigars = [
        { name: 'Сигареты', price: 500 },
        { name: 'Самокрут Марихуана', price: 1500 },
        { name: 'Самокрут Мескалин', price: 2200 },
        { name: 'Самокрут Гашик', price: 2200 },
        { name: 'Самокрут Моракс', price: 2350 },
        { name: 'Сигара Вудди', price: 2500 },
        { name: 'Сигара Маковая соломка', price: 2750 },
        { name: 'Сигара Ананас', price: 2900 },
        { name: 'Сигара Блондик', price: 5000 }
    ];

    function updateCigarTotals() {
        cigarTotalDisplay.textContent = cigarTotalSum.toLocaleString('ru-RU');
        cigarFinalDisplay.textContent = Math.round(cigarTotalSum * (1 + currentCigarBonus / 100)).toLocaleString('ru-RU');
    }

    function saveCigarPricesToStorage() {
        const prices = cigars.map(c => c.price);
        localStorage.setItem('cigarPrices', JSON.stringify(prices));
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
            cigarTotalSum += actualDelta * cigar.price;
            updateCigarTotals();
        };

        addBtn.addEventListener('click', () => updateQuantity(1));
        subBtn.addEventListener('click', () => updateQuantity(-1));

        // Редактирование цены при двойном клике
        priceDiv.addEventListener('dblclick', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'price-input';
            input.value = cigar.price;
            input.min = '0';
            input.step = '1';

            priceDiv.textContent = '';
            priceDiv.appendChild(input);
            input.focus();

            const saveNewPrice = () => {
                const parsedPrice = parseInt(input.value, 10);
                const newPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : cigar.price;
                cigar.price = newPrice;
                priceDiv.textContent = newPrice + ' руб.';

                cigarTotalSum = Array.from(cigarQuantityElements.entries()).reduce((sum, [name, span]) => {
                    const cigarItem = cigars.find(item => item.name === name);
                    return sum + (parseInt(span.textContent) * cigarItem.price);
                }, 0);

                updateCigarTotals();
                saveCigarPricesToStorage();
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

        itemDiv.appendChild(nameDiv);
        itemDiv.appendChild(priceDiv);
        itemDiv.appendChild(controlsDiv);
        cigarButtonsContainer.appendChild(itemDiv);
    }

    cigarSearchInput.addEventListener('input', () => {
        const searchTerm = cigarSearchInput.value.toLowerCase().trim();
        cigarButtonsContainer.querySelectorAll('.cigar-item').forEach(item => {
            const cigarName = item.dataset.cigarName || '';
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
        cigarSearchInput.value = '';
        cigarButtonsContainer.querySelectorAll('.cigar-item').forEach(item => item.classList.remove('hidden'));
        updateCigarTotals();
    });

    // Загрузка сохранённых цен сигар
    const savedCigarPrices = localStorage.getItem('cigarPrices');
    if (savedCigarPrices) {
        try {
            const prices = JSON.parse(savedCigarPrices);
            if (Array.isArray(prices)) {
                cigars.forEach((cigar, index) => {
                    const savedPrice = prices[index];
                    if (Number.isFinite(savedPrice) && savedPrice >= 0) {
                        cigar.price = savedPrice;
                    }
                });
            }
        } catch (error) {
            console.warn('Не удалось загрузить сохраненные цены сигар:', error);
            localStorage.removeItem('cigarPrices');
        }
    }

    cigars.forEach(cigar => createCigarButton(cigar));
    cigarBonusButtons[0].classList.add('active');

    // Копирование по клику
    totalDisplay.addEventListener('click', (e) => copyToClipboard(totalSum.toString(), e));
    finalDisplay.addEventListener('click', (e) => copyToClipboard(Math.round(totalSum * (1 + currentBonus / 100)).toString(), e));
    mutantTotalDisplay.addEventListener('click', (e) => copyToClipboard(mutantTotalSum.toString(), e));
    mutantFinalDisplay.addEventListener('click', (e) => copyToClipboard(Math.round(mutantTotalSum * (1 - currentMutantBonus / 100)).toString(), e));
    cigarTotalDisplay.addEventListener('click', (e) => copyToClipboard(cigarTotalSum.toString(), e));
    cigarFinalDisplay.addEventListener('click', (e) => copyToClipboard(Math.round(cigarTotalSum * (1 + currentCigarBonus / 100)).toString(), e));
})();
