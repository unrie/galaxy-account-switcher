// ==UserScript==
// @name         Galaxy Multi-Account Switcher
// @namespace    https://github.com/unrie/galaxy-account-switcher
// @version      1.2.0
// @description  Панель со всеми аккаунтами Galaxy из cookie. Обходит лимит в 3 аккаунта через управление sortOrder.
// @author       unrie
// @match        https://galaxy.mobstudio.ru/web/*
// @icon         https://galaxy.mobstudio.ru/web/assets/icon64.png
// @grant        none
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window.self) return;
    if (window.__galaxySwitcherLoaded) return;
    window.__galaxySwitcherLoaded = true;

    const COOKIE = 'client';

    const getCookie = (name) => {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    };

    const setCookie = (name, value) => {
        const expires = '; expires=' + new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/web; SameSite=Lax`;
        document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
    };

    const getData = () => {
        const raw = getCookie(COOKIE);
        try {
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    };

    /**
     * Переключение аккаунта.
     * Поднимает sortOrder выбранного аккаунта выше всех остальных,
     * чтобы он гарантированно попал в нативный топ-3, затем меняет _id и перезагружает страницу.
     */
    function switchTo(id) {
        const data = getData();
        if (!data || !data.users || !data.users.byId) return;

        const byId = data.users.byId;
        const key = String(id);
        if (!byId[key]) return;

        let maxSort = 0;
        for (const k in byId) {
            const s = Number(byId[k].sortOrder) || 0;
            if (s > maxSort) maxSort = s;
        }
        byId[key].sortOrder = maxSort + 1;

        data.users._id = isNaN(Number(id)) ? id : Number(id);
        setCookie(COOKIE, JSON.stringify(data));
        location.reload();
    }

    function buildPanel() {
        document.querySelectorAll('#galaxy-acc-panel').forEach(el => el.remove());

        const data = getData();
        if (!data || !data.users || !data.users.byId) return;

        const byId = data.users.byId;
        const currentId = String(data.users._id);
        const accounts = Object.values(byId).sort(
            (a, b) => (b.sortOrder || 0) - (a.sortOrder || 0)
        );

        const panel = document.createElement('div');
        panel.id = 'galaxy-acc-panel';
        panel.style.cssText = `
            position: fixed; z-index: 2147483647; left: 12px; bottom: 12px;
            background: #1e1e1e; color: #fff; padding: 10px; border-radius: 8px;
            font: 13px Roboto, Arial, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,.6);
            min-width: 210px; max-width: 300px; user-select: none;
        `;

        const header = document.createElement('div');
        header.textContent = `Аккаунты (${accounts.length})`;
        header.style.cssText = 'font-weight: bold; margin-bottom: 8px; padding-right: 20px;';
        panel.appendChild(header);

        accounts.forEach((acc, idx) => {
            const isCurrent = String(acc.id) === currentId;
            const inTop3 = idx < 3;

            const btn = document.createElement('button');
            btn.textContent = (isCurrent ? '● ' : '○ ') + (acc.nick || acc.id) + (inTop3 ? '  ✓' : '');
            btn.style.cssText = `
                display: block; width: 100%; margin: 3px 0; padding: 7px 10px;
                background: ${isCurrent ? '#4CAF50' : inTop3 ? '#2a3a2a' : '#2c2c2c'};
                color: #fff; border: 1px solid ${isCurrent ? '#4CAF50' : '#444'};
                border-radius: 5px; cursor: ${isCurrent ? 'default' : 'pointer'};
                text-align: left; font-size: 13px; font-family: inherit;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            `;
            btn.title = `ID ${acc.id} · ${acc.nick || ''} · sortOrder=${acc.sortOrder}${inTop3 ? ' · в нативном списке' : ''}`;

            if (!isCurrent) {
                btn.onmouseenter = () => (btn.style.background = '#3a3a3a');
                btn.onmouseleave = () => (btn.style.background = inTop3 ? '#2a3a2a' : '#2c2c2c');
                btn.onclick = () => switchTo(acc.id);
            }
            panel.appendChild(btn);
        });

        const hint = document.createElement('div');
        hint.textContent = '✓ — отображается в нативном списке';
        hint.style.cssText = 'margin-top: 6px; font-size: 10px; color: #888;';
        panel.appendChild(hint);

        const close = document.createElement('button');
        close.textContent = '✕';
        close.style.cssText = `
            position: absolute; top: 6px; right: 8px;
            background: transparent; color: #888; border: none;
            font-size: 16px; cursor: pointer; line-height: 1;
        `;
        close.onclick = () => panel.remove();
        panel.appendChild(close);

        document.body.appendChild(panel);
    }

    function init() {
        if (!document.body) return;
        buildPanel();

        let lastCookie = getCookie(COOKIE);
        setInterval(() => {
            const current = getCookie(COOKIE);
            if (current !== lastCookie) {
                lastCookie = current;
                buildPanel();
            }
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();