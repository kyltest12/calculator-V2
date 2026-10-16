(function () {
    "use strict";

    const StalkerCalc = window.StalkerCalc = window.StalkerCalc || {};

    StalkerCalc.fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="70" height="70"%3E%3Crect fill="white" width="70" height="70"/%3E%3C/svg%3E';
    StalkerCalc.METRIKA_COUNTER_ID = 109681385;

    // === ПАРОЛИ РАЗДЕЛОВ ===
    // Меняйте эти значения периодически перед публикацией сайта.
    // На статическом сайте это защита от обычного просмотра, а не полноценная серверная авторизация.
    const sectionAccessConfig = {
        artifacts: { title: 'Калькулятор цены артефактов', password: 'Art7Kx92mQr4' },
        mutants: { title: 'Скупка частей мутантов', password: 'Mut3Vb58Ldn1' },
        cigars: { title: 'Калькулятор сигар', password: 'Cig9Wp16Ztq5' },
        traders: { title: 'Оружие, расходники и маскировки', password: 'Trd8Qp41Wmz6' }
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
            copyTooltip.style.opacity = '1';
            setTimeout(() => {
                copyTooltip.style.opacity = '0';
                setTimeout(() => copyTooltip.remove(), 200);
            }, 800);
        }).catch(err => {
            alert('Не удалось скопировать: ' + err);
        });
    };

    // === ОТПРАВКА СОБЫТИЙ В ЯНДЕКС.МЕТРИКУ ===
    // goalName — название цели (настраивается в интерфейсе Метрики, либо просто фиксируется как есть).
    // params — произвольный объект с деталями (сумма, бонус, список позиций и т.д.).
    StalkerCalc.sendMetrikaEvent = function (goalName, params) {
        try {
            if (typeof window.ym === 'function') {
                window.ym(StalkerCalc.METRIKA_COUNTER_ID, 'reachGoal', goalName, params);
            } else {
                console.warn('Яндекс.Метрика недоступна, событие не отправлено:', goalName, params);
            }
        } catch (error) {
            console.warn('Не удалось отправить событие в Яндекс.Метрику:', error);
        }
    };

    // Создаёт автономный "отправитель" события в Метрику с задержкой (debounce):
    // при каждом вызове schedule(getPayload) таймер сбрасывается и запускается заново,
    // событие реально уйдёт только через delayMs после ПОСЛЕДНЕГО вызова, и только
    // если на момент отправки getPayload().totalSum > 0 (нулевые/сброшенные суммы не шлём).
    StalkerCalc.createDebouncedMetrikaSender = function (goalName, delayMs) {
        let timer = null;
        return {
            schedule(getPayload) {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    timer = null;
                    const payload = getPayload();
                    if (payload && payload.totalSum > 0) {
                        StalkerCalc.sendMetrikaEvent(goalName, payload);
                    }
                }, delayMs || 1500);
            },
            cancel() {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            }
        };
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
        const hasVisited = localStorage.getItem('hasVisitedBefore');
        if (hasVisited) return;

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

        let escHandler = null;
        const closeWelcome = () => {
            welcomeOverlay.style.opacity = '0';
            welcomeBox.style.transform = 'scale(0.9)';
            setTimeout(() => welcomeOverlay.remove(), 300);
            localStorage.setItem('hasVisitedBefore', 'true');
            if (escHandler) document.removeEventListener('keydown', escHandler);
        };

        const closeBtn = welcomeBox.querySelector('#welcomeCloseBtn');
        closeBtn.addEventListener('click', closeWelcome);

        welcomeOverlay.addEventListener('click', (e) => {
            if (e.target === welcomeOverlay) closeWelcome();
        });

        escHandler = (e) => {
            if (e.key === 'Escape') closeWelcome();
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
    };

    StalkerCalc.loadDataFile = async function (url) {
        try {
            const versionedUrl = `${url}?v=20260920-trader-items-4`;
            const response = await fetch(versionedUrl, { cache: 'no-cache' });
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

        const [artifactsData, mutantsData, cigarsData, traderData] = await Promise.all([
            StalkerCalc.loadDataFile('data/artifacts.json'),
            StalkerCalc.loadDataFile('data/mutants.json'),
            StalkerCalc.loadDataFile('data/cigars.json'),
            StalkerCalc.loadDataFile('data/trader-items.json')
        ]);

        if (!artifactsData || !mutantsData || !cigarsData || !traderData) {
            alert('Не удалось загрузить данные калькулятора. Запустите сайт через локальный сервер (python -m http.server).');
            return;
        }

        StalkerCalc.initArtifacts(artifactsData);
        StalkerCalc.initMutants(mutantsData);
        StalkerCalc.initCigars(cigarsData);
        StalkerCalc.initTraderItems(traderData);

        document.querySelectorAll('.site-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tabTarget;
                document.querySelectorAll('.site-tab').forEach(item => item.classList.toggle('active', item === tab));
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === targetId));
            });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => StalkerCalc.boot());
    } else {
        StalkerCalc.boot();
    }
})();
