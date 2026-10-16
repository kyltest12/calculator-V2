(function () {
    "use strict";

    const StalkerCalc = window.StalkerCalc = window.StalkerCalc || {};

    StalkerCalc.fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="70" height="70"%3E%3Crect fill="white" width="70" height="70"/%3E%3C/svg%3E';

    const sectionAccessConfig = {
        artifacts: { title: 'Калькулятор цены артефактов', password: 'artifacts-2026-05-08' },
        mutants: { title: 'Скупка частей мутантов', password: 'mutants-2026-05-08' },
        cigars: { title: 'Калькулятор сигар', password: 'cigars-2026-05-08' }
    };
    const sectionAccessDurationMs = 7 * 24 * 60 * 60 * 1000;

    function getAccessStorageKey(sectionKey) {
        return `sectionAccess_${sectionKey}`;
    }

    StalkerCalc.hasSectionAccess = function (sectionKey) {
        const savedAccess = localStorage.getItem(getAccessStorageKey(sectionKey));
        if (!savedAccess) return false;

        try {
            const accessData = JSON.parse(savedAccess);
            if (accessData && Number.isFinite(accessData.expiresAt) && accessData.expiresAt > Date.now()) {
                return true;
            }
        } catch (error) {
            console.warn('Не удалось прочитать доступ к разделу:', error);
        }

        localStorage.removeItem(getAccessStorageKey(sectionKey));
        return false;
    };

    function saveSectionAccess(sectionKey) {
        localStorage.setItem(getAccessStorageKey(sectionKey), JSON.stringify({
            expiresAt: Date.now() + sectionAccessDurationMs
        }));
    }

    StalkerCalc.setupSectionAccess = function (sectionKey, elements) {
        const config = sectionAccessConfig[sectionKey];
        const validElements = elements.filter(Boolean);
        if (!config || validElements.length === 0) return;

        const gate = document.createElement('form');
        gate.className = `access-gate access-gate-${sectionKey}`;
        gate.innerHTML = `
            <h2>${config.title}</h2>
            <div class="access-gate-box">
                <label for="accessPassword_${sectionKey}">Пароль раздела</label>
                <div class="access-gate-row">
                    <input type="password" id="accessPassword_${sectionKey}" autocomplete="current-password" placeholder="Введите пароль">
                    <button type="submit">Открыть</button>
                </div>
                <div class="access-gate-error" role="alert"></div>
            </div>
        `;

        validElements[0].before(gate);

        const input = gate.querySelector('input');
        const error = gate.querySelector('.access-gate-error');

        const setUnlocked = (isUnlocked) => {
            gate.classList.toggle('hidden', isUnlocked);
            validElements.forEach(element => {
                element.classList.toggle('section-locked', !isUnlocked);
            });
        };

        setUnlocked(StalkerCalc.hasSectionAccess(sectionKey));

        gate.addEventListener('submit', (event) => {
            event.preventDefault();
            if (input.value === config.password) {
                saveSectionAccess(sectionKey);
                input.value = '';
                error.textContent = '';
                setUnlocked(true);
                return;
            }

            error.textContent = 'Неверный пароль';
            input.select();
        });
    };

    StalkerCalc.copyToClipboard = function (text, event) {
        if (!text) return;
        if (!navigator.clipboard) {
            alert('Копирование недоступно: откройте сайт по https.');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            const copyTooltip = document.createElement('div');
            copyTooltip.className = 'copy-tooltip';
            copyTooltip.textContent = 'Скопировано!';
            document.body.appendChild(copyTooltip);
            copyTooltip.style.left = (event.clientX + 15) + 'px';
            copyTooltip.style.top = (event.clientY - 30) + 'px';
            requestAnimationFrame(() => { copyTooltip.style.opacity = '1'; });
            setTimeout(() => {
                copyTooltip.style.opacity = '0';
                setTimeout(() => copyTooltip.remove(), 200);
            }, 800);
        }).catch(err => {
            alert('Не удалось скопировать: ' + err);
        });
    };

    StalkerCalc.parsePropertyValue = function (value) {
        if (!value) return Number.NEGATIVE_INFINITY;
        const normalizedValue = String(value).replace(',', '.');
        const match = normalizedValue.match(/[+-]?\d+(?:\.\d+)?/);
        return match ? parseFloat(match[0]) : Number.NEGATIVE_INFINITY;
    };

    StalkerCalc.updateItemSelectedState = function (itemDiv, quantity) {
        itemDiv.classList.toggle('item-selected', quantity > 0);
    };

    StalkerCalc.initTheme = function () {
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
    };

    StalkerCalc.showWelcomeMessage = function () {
        if (localStorage.getItem('hasVisitedBefore')) return;

        const welcomeOverlay = document.createElement('div');
        welcomeOverlay.className = 'welcome-overlay';

        const welcomeBox = document.createElement('div');
        welcomeBox.className = 'welcome-box';
        welcomeBox.innerHTML = `
            <div class="welcome-icon">💎</div>
            <p class="welcome-lead">Это калькулятор для подсчёта стоимости артефактов, частей мутантов и сигар.</p>
            <div class="welcome-hints">
                <strong>🎮 Горячие клавиши</strong>
                <ul>
                    <li>Клик по картинке — добавить 1 шт.</li>
                    <li>Shift + клик / ПКМ — убрать 1 шт.</li>
                    <li>Средняя кнопка мыши — сбросить позицию</li>
                    <li>Двойной клик по цене — изменить цену</li>
                    <li>Наведение на артефакт — показать свойства</li>
                </ul>
            </div>
            <button type="button" id="welcomeCloseBtn" class="welcome-btn">Понятно</button>
        `;

        welcomeOverlay.appendChild(welcomeBox);
        document.body.appendChild(welcomeOverlay);
        requestAnimationFrame(() => welcomeOverlay.classList.add('visible'));

        const escHandler = (e) => {
            if (e.key === 'Escape') closeWelcome();
        };

        function closeWelcome() {
            welcomeOverlay.classList.remove('visible');
            setTimeout(() => welcomeOverlay.remove(), 300);
            localStorage.setItem('hasVisitedBefore', 'true');
            document.removeEventListener('keydown', escHandler);
        }

        welcomeBox.querySelector('#welcomeCloseBtn').addEventListener('click', closeWelcome);
        welcomeOverlay.addEventListener('click', (e) => {
            if (e.target === welcomeOverlay) closeWelcome();
        });
        document.addEventListener('keydown', escHandler);
    };

    StalkerCalc.loadDataFile = async function (url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Не удалось загрузить ${url}:`, error);
            return null;
        }
    };

    StalkerCalc.boot = async function () {
        StalkerCalc.initTheme();
        StalkerCalc.showWelcomeMessage();

        const [artifactsData, mutantsData, cigarsData] = await Promise.all([
            StalkerCalc.loadDataFile('data/artifacts.json'),
            StalkerCalc.loadDataFile('data/mutants.json'),
            StalkerCalc.loadDataFile('data/cigars.json')
        ]);

        if (!artifactsData || !mutantsData || !cigarsData) {
            alert('Не удалось загрузить данные калькулятора. Если вы открыли файл напрямую, запустите сайт через локальный сервер (python -m http.server).');
            return;
        }

        StalkerCalc.initArtifacts(artifactsData);
        StalkerCalc.initMutants(mutantsData);
        StalkerCalc.initCigars(cigarsData);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => StalkerCalc.boot());
    } else {
        StalkerCalc.boot();
    }
})();
