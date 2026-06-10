(function () {
    "use strict";

    const StalkerCalc = window.StalkerCalc = window.StalkerCalc || {};

    StalkerCalc.fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="70" height="70"%3E%3Crect fill="white" width="70" height="70"/%3E%3C/svg%3E';
    StalkerCalc.DEAL_HISTORY_KEY = 'artifactDealHistory';

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

        const closeWelcome = () => {
            welcomeOverlay.style.opacity = '0';
            welcomeBox.style.transform = 'scale(0.9)';
            setTimeout(() => welcomeOverlay.remove(), 300);
            localStorage.setItem('hasVisitedBefore', 'true');
        };

        const closeBtn = welcomeBox.querySelector('#welcomeCloseBtn');
        closeBtn.addEventListener('click', closeWelcome);

        welcomeOverlay.addEventListener('click', (e) => {
            if (e.target === welcomeOverlay) closeWelcome();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeWelcome();
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

    StalkerCalc.getDealHistory = function () {
        try {
            const saved = localStorage.getItem(StalkerCalc.DEAL_HISTORY_KEY);
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Не удалось прочитать историю сделок:', error);
            return [];
        }
    };

    StalkerCalc.saveDealHistory = function (history) {
        localStorage.setItem(StalkerCalc.DEAL_HISTORY_KEY, JSON.stringify(history));
    };

    StalkerCalc.initSidebar = function (getArtifactState, restoreArtifactState) {
        const sidebar = document.getElementById('dealSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const openBtn = document.getElementById('sidebarToggleBtn');
        const closeBtn = document.getElementById('sidebarCloseBtn');
        const saveBtn = document.getElementById('saveDealBtn');
        const historyList = document.getElementById('dealHistoryList');
        const clearHistoryBtn = document.getElementById('clearDealHistoryBtn');

        if (!sidebar || !openBtn) return;

        const formatDate = (isoString) => {
            const date = new Date(isoString);
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const renderHistory = () => {
            const history = StalkerCalc.getDealHistory();
            historyList.innerHTML = '';

            if (history.length === 0) {
                historyList.innerHTML = '<p class="sidebar-empty">Нет сохранённых сделок</p>';
                return;
            }

            history.forEach((deal, index) => {
                const item = document.createElement('div');
                item.className = 'sidebar-deal-item';
                const itemCount = deal.items.reduce((sum, entry) => sum + entry.qty, 0);
                item.innerHTML = `
                    <div class="sidebar-deal-header">
                        <span class="sidebar-deal-date">${formatDate(deal.date)}</span>
                        <span class="sidebar-deal-sum">${deal.finalSum.toLocaleString('ru-RU')} руб.</span>
                    </div>
                    <div class="sidebar-deal-meta">${itemCount} шт. · ${deal.items.length} поз.</div>
                    <div class="sidebar-deal-details hidden"></div>
                    <div class="sidebar-deal-actions">
                        <button type="button" class="sidebar-action-btn" data-action="details">Подробнее</button>
                        <button type="button" class="sidebar-action-btn sidebar-action-restore" data-action="restore">Восстановить</button>
                        <button type="button" class="sidebar-action-btn sidebar-action-delete" data-action="delete">Удалить</button>
                    </div>
                `;

                const detailsEl = item.querySelector('.sidebar-deal-details');
                const detailsBtn = item.querySelector('[data-action="details"]');

                detailsBtn.addEventListener('click', () => {
                    const isHidden = detailsEl.classList.contains('hidden');
                    if (isHidden) {
                        detailsEl.innerHTML = deal.items.map(entry =>
                            `<div>${entry.name}: ${entry.qty} шт. × ${entry.price.toLocaleString('ru-RU')} = ${(entry.qty * entry.price).toLocaleString('ru-RU')} руб.</div>`
                        ).join('');
                        detailsEl.classList.remove('hidden');
                        detailsBtn.textContent = 'Скрыть';
                    } else {
                        detailsEl.classList.add('hidden');
                        detailsBtn.textContent = 'Подробнее';
                    }
                });

                item.querySelector('[data-action="restore"]').addEventListener('click', () => {
                    restoreArtifactState(deal);
                    closeSidebar();
                });

                item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                    const updated = StalkerCalc.getDealHistory().filter((_, i) => i !== index);
                    StalkerCalc.saveDealHistory(updated);
                    renderHistory();
                });

                historyList.appendChild(item);
            });
        };

        const openSidebar = () => {
            sidebar.classList.add('open');
            overlay.classList.add('visible');
            document.body.classList.add('sidebar-open');
            renderHistory();
        };

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
            document.body.classList.remove('sidebar-open');
        };

        openBtn.addEventListener('click', openSidebar);
        closeBtn.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });

        saveBtn.addEventListener('click', () => {
            const state = getArtifactState();
            if (!state.items.length) {
                alert('Нет выбранных артефактов для сохранения');
                return;
            }

            const history = StalkerCalc.getDealHistory();
            history.unshift({
                id: Date.now(),
                date: new Date().toISOString(),
                totalSum: state.totalSum,
                bonus: state.bonus,
                finalSum: state.finalSum,
                items: state.items
            });

            if (history.length > 50) history.length = 50;
            StalkerCalc.saveDealHistory(history);
            renderHistory();
            openSidebar();
        });

        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Очистить всю историю сделок?')) {
                StalkerCalc.saveDealHistory([]);
                renderHistory();
            }
        });
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
            alert('Не удалось загрузить данные калькулятора. Запустите сайт через локальный сервер (python -m http.server).');
            return;
        }

        const artifactApi = StalkerCalc.initArtifacts(artifactsData);
        StalkerCalc.initMutants(mutantsData);
        StalkerCalc.initCigars(cigarsData);
        StalkerCalc.initSidebar(artifactApi.getState, artifactApi.restoreState);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => StalkerCalc.boot());
    } else {
        StalkerCalc.boot();
    }
})();
