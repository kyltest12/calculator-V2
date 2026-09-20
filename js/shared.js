(function () {
    "use strict";

    const StalkerCalc = window.StalkerCalc = window.StalkerCalc || {};

    StalkerCalc.fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="70" height="70"%3E%3Crect fill="white" width="70" height="70"/%3E%3C/svg%3E';
    StalkerCalc.DEAL_HISTORY_KEY = 'artifactDealHistory';
    StalkerCalc.METRIKA_COUNTER_ID = 109681385;

    // === РџРђР РћР›Р Р РђР—Р”Р•Р›РћР’ ===
    // РњРµРЅСЏР№С‚Рµ СЌС‚Рё Р·РЅР°С‡РµРЅРёСЏ РїРµСЂРёРѕРґРёС‡РµСЃРєРё РїРµСЂРµРґ РїСѓР±Р»РёРєР°С†РёРµР№ СЃР°Р№С‚Р°.
    // РќР° СЃС‚Р°С‚РёС‡РµСЃРєРѕРј СЃР°Р№С‚Рµ СЌС‚Рѕ Р·Р°С‰РёС‚Р° РѕС‚ РѕР±С‹С‡РЅРѕРіРѕ РїСЂРѕСЃРјРѕС‚СЂР°, Р° РЅРµ РїРѕР»РЅРѕС†РµРЅРЅР°СЏ СЃРµСЂРІРµСЂРЅР°СЏ Р°РІС‚РѕСЂРёР·Р°С†РёСЏ.
    const sectionAccessConfig = {
        artifacts: { title: 'РљР°Р»СЊРєСѓР»СЏС‚РѕСЂ С†РµРЅС‹ Р°СЂС‚РµС„Р°РєС‚РѕРІ', password: 'Art7Kx92mQr4' },
        mutants: { title: 'РЎРєСѓРїРєР° С‡Р°СЃС‚РµР№ РјСѓС‚Р°РЅС‚РѕРІ', password: 'Mut3Vb58Ldn1' },
        cigars: { title: 'РљР°Р»СЊРєСѓР»СЏС‚РѕСЂ СЃРёРіР°СЂ', password: 'Cig9Wp16Ztq5' },
        traders: { title: 'РћСЂСѓР¶РёРµ, СЂР°СЃС…РѕРґРЅРёРєРё Рё РјР°СЃРєРёСЂРѕРІРєРё', password: 'Trd8Qp41Wmz6' }
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
            console.warn('РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ РґРѕСЃС‚СѓРї Рє СЂР°Р·РґРµР»Сѓ:', error);
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
                <label for="accessPassword_${sectionKey}">РџР°СЂРѕР»СЊ СЂР°Р·РґРµР»Р°</label>
                <div class="access-gate-row">
                    <input type="password" id="accessPassword_${sectionKey}" autocomplete="current-password" placeholder="Р’РІРµРґРёС‚Рµ РїР°СЂРѕР»СЊ">
                    <button type="submit">РћС‚РєСЂС‹С‚СЊ</button>
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

            error.textContent = 'РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ';
            input.select();
        });
    };

    StalkerCalc.copyToClipboard = function (text, event) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const copyTooltip = document.createElement('div');
            copyTooltip.className = 'copy-tooltip';
            copyTooltip.textContent = 'РЎРєРѕРїРёСЂРѕРІР°РЅРѕ!';
            document.body.appendChild(copyTooltip);
            copyTooltip.style.left = (event.clientX + 15) + 'px';
            copyTooltip.style.top = (event.clientY - 30) + 'px';
            copyTooltip.style.opacity = '1';
            setTimeout(() => {
                copyTooltip.style.opacity = '0';
                setTimeout(() => copyTooltip.remove(), 200);
            }, 800);
        }).catch(err => {
            alert('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ: ' + err);
        });
    };

    // === РћРўРџР РђР’РљРђ РЎРћР‘Р«РўРР™ Р’ РЇРќР”Р•РљРЎ.РњР•РўР РРљРЈ ===
    // goalName вЂ” РЅР°Р·РІР°РЅРёРµ С†РµР»Рё (РЅР°СЃС‚СЂР°РёРІР°РµС‚СЃСЏ РІ РёРЅС‚РµСЂС„РµР№СЃРµ РњРµС‚СЂРёРєРё, Р»РёР±Рѕ РїСЂРѕСЃС‚Рѕ С„РёРєСЃРёСЂСѓРµС‚СЃСЏ РєР°Рє РµСЃС‚СЊ).
    // params вЂ” РїСЂРѕРёР·РІРѕР»СЊРЅС‹Р№ РѕР±СЉРµРєС‚ СЃ РґРµС‚Р°Р»СЏРјРё (СЃСѓРјРјР°, Р±РѕРЅСѓСЃ, СЃРїРёСЃРѕРє РїРѕР·РёС†РёР№ Рё С‚.Рґ.).
    StalkerCalc.sendMetrikaEvent = function (goalName, params) {
        try {
            if (typeof window.ym === 'function') {
                window.ym(StalkerCalc.METRIKA_COUNTER_ID, 'reachGoal', goalName, params);
            } else {
                console.warn('РЇРЅРґРµРєСЃ.РњРµС‚СЂРёРєР° РЅРµРґРѕСЃС‚СѓРїРЅР°, СЃРѕР±С‹С‚РёРµ РЅРµ РѕС‚РїСЂР°РІР»РµРЅРѕ:', goalName, params);
            }
        } catch (error) {
            console.warn('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ СЃРѕР±С‹С‚РёРµ РІ РЇРЅРґРµРєСЃ.РњРµС‚СЂРёРєСѓ:', error);
        }
    };

    // РЎРѕР·РґР°С‘С‚ Р°РІС‚РѕРЅРѕРјРЅС‹Р№ "РѕС‚РїСЂР°РІРёС‚РµР»СЊ" СЃРѕР±С‹С‚РёСЏ РІ РњРµС‚СЂРёРєСѓ СЃ Р·Р°РґРµСЂР¶РєРѕР№ (debounce):
    // РїСЂРё РєР°Р¶РґРѕРј РІС‹Р·РѕРІРµ schedule(getPayload) С‚Р°Р№РјРµСЂ СЃР±СЂР°СЃС‹РІР°РµС‚СЃСЏ Рё Р·Р°РїСѓСЃРєР°РµС‚СЃСЏ Р·Р°РЅРѕРІРѕ,
    // СЃРѕР±С‹С‚РёРµ СЂРµР°Р»СЊРЅРѕ СѓР№РґС‘С‚ С‚РѕР»СЊРєРѕ С‡РµСЂРµР· delayMs РїРѕСЃР»Рµ РџРћРЎР›Р•Р”РќР•Р“Рћ РІС‹Р·РѕРІР°, Рё С‚РѕР»СЊРєРѕ
    // РµСЃР»Рё РЅР° РјРѕРјРµРЅС‚ РѕС‚РїСЂР°РІРєРё getPayload().totalSum > 0 (РЅСѓР»РµРІС‹Рµ/СЃР±СЂРѕС€РµРЅРЅС‹Рµ СЃСѓРјРјС‹ РЅРµ С€Р»С‘Рј).
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
            themeToggle.textContent = isDark ? 'вЂпёЏ' : 'рџЊ™';
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
            <div style="font-size: 60px; margin-bottom: 15px;">рџ’Ћ</div>
            <p style="margin-bottom: 10px; font-size: 16px;">Р­С‚Рѕ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂ РґР»СЏ РїРѕРґСЃС‡С‘С‚Р° СЃС‚РѕРёРјРѕСЃС‚Рё Р°СЂС‚РµС„Р°РєС‚РѕРІ Рё С‡Р°СЃС‚РµР№ РјСѓС‚Р°РЅС‚РѕРІ.</p>
            <p style="margin-bottom: 20px; font-size: 14px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
                рџЋ® <strong>Р“РѕСЂСЏС‡РёРµ РєР»Р°РІРёС€Рё:</strong><br>
                вЂў РљР»РёРє РїРѕ РєР°СЂС‚РёРЅРєРµ вЂ” РґРѕР±Р°РІРёС‚СЊ 1 С€С‚.<br>
                вЂў Shift + РєР»РёРє / РџРљРњ вЂ” СѓР±СЂР°С‚СЊ 1 С€С‚.<br>
                вЂў РЎСЂРµРґРЅСЏСЏ РєРЅРѕРїРєР° РјС‹С€Рё вЂ” СЃР±СЂРѕСЃРёС‚СЊ Р°СЂС‚РµС„Р°РєС‚<br>
                вЂў Р”РІРѕР№РЅРѕР№ РєР»РёРє РїРѕ С†РµРЅРµ вЂ” РёР·РјРµРЅРёС‚СЊ С†РµРЅСѓ<br>
                вЂў РќР°РІРµРґРµРЅРёРµ РЅР° Р°СЂС‚РµС„Р°РєС‚ вЂ” РїРѕРєР°Р·Р°С‚СЊ СЃРІРѕР№СЃС‚РІР°
            </p>
            <button id="welcomeCloseBtn" style="
                background: white; color: var(--bg-header2); border: none; padding: 12px 30px;
                border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer;
                transition: all 0.2s; border: 2px solid transparent;
            ">РџРѕРЅСЏС‚РЅРѕ</button>
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
            const versionedUrl = `${url}?v=20260920-trader-items-3`;
            const response = await fetch(versionedUrl, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ ${url}:`, error);
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
            console.warn('РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ РёСЃС‚РѕСЂРёСЋ СЃРґРµР»РѕРє:', error);
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
                historyList.innerHTML = '<p class="sidebar-empty">РќРµС‚ СЃРѕС…СЂР°РЅС‘РЅРЅС‹С… СЃРґРµР»РѕРє</p>';
                return;
            }

            history.forEach((deal, index) => {
                const item = document.createElement('div');
                item.className = 'sidebar-deal-item';
                const itemCount = deal.items.reduce((sum, entry) => sum + entry.qty, 0);
                item.innerHTML = `
                    <div class="sidebar-deal-header">
                        <span class="sidebar-deal-date">${formatDate(deal.date)}</span>
                        <span class="sidebar-deal-sum">${deal.finalSum.toLocaleString('ru-RU')} СЂСѓР±.</span>
                    </div>
                    <div class="sidebar-deal-meta">${itemCount} С€С‚. В· ${deal.items.length} РїРѕР·.</div>
                    <div class="sidebar-deal-details hidden"></div>
                    <div class="sidebar-deal-actions">
                        <button type="button" class="sidebar-action-btn" data-action="details">РџРѕРґСЂРѕР±РЅРµРµ</button>
                        <button type="button" class="sidebar-action-btn sidebar-action-restore" data-action="restore">Р’РѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ</button>
                        <button type="button" class="sidebar-action-btn sidebar-action-delete" data-action="delete">РЈРґР°Р»РёС‚СЊ</button>
                    </div>
                `;

                const detailsEl = item.querySelector('.sidebar-deal-details');
                const detailsBtn = item.querySelector('[data-action="details"]');

                detailsBtn.addEventListener('click', () => {
                    const isHidden = detailsEl.classList.contains('hidden');
                    if (isHidden) {
                        detailsEl.innerHTML = deal.items.map(entry =>
                            `<div>${entry.name}: ${entry.qty} С€С‚. Г— ${entry.price.toLocaleString('ru-RU')} = ${(entry.qty * entry.price).toLocaleString('ru-RU')} СЂСѓР±.</div>`
                        ).join('');
                        detailsEl.classList.remove('hidden');
                        detailsBtn.textContent = 'РЎРєСЂС‹С‚СЊ';
                    } else {
                        detailsEl.classList.add('hidden');
                        detailsBtn.textContent = 'РџРѕРґСЂРѕР±РЅРµРµ';
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
                alert('РќРµС‚ РІС‹Р±СЂР°РЅРЅС‹С… Р°СЂС‚РµС„Р°РєС‚РѕРІ РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ');
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
            if (confirm('РћС‡РёСЃС‚РёС‚СЊ РІСЃСЋ РёСЃС‚РѕСЂРёСЋ СЃРґРµР»РѕРє?')) {
                StalkerCalc.saveDealHistory([]);
                renderHistory();
            }
        });
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
            alert('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂР°. Р—Р°РїСѓСЃС‚РёС‚Рµ СЃР°Р№С‚ С‡РµСЂРµР· Р»РѕРєР°Р»СЊРЅС‹Р№ СЃРµСЂРІРµСЂ (python -m http.server).');
            return;
        }

        const artifactApi = StalkerCalc.initArtifacts(artifactsData);
        StalkerCalc.initMutants(mutantsData);
        StalkerCalc.initCigars(cigarsData);
        StalkerCalc.initTraderItems(traderData);
        StalkerCalc.initSidebar(artifactApi.getState, artifactApi.restoreState);

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
