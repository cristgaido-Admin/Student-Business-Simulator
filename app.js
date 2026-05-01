document.addEventListener("DOMContentLoaded", () => {
    // DOM elements for Screens
    const loginScreen = document.getElementById("login-screen");
    const adminScreen = document.getElementById("admin-screen");
    const studentScreen = document.getElementById("student-screen");

    // Login Form Elements
    const loginUsernameInput = document.getElementById("login-username");
    const loginPasswordInput = document.getElementById("login-password");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const btnLogoutAdmin = document.getElementById("btn-logout-admin");

    // Role Selection Elements
    const btnRoleStudent = document.getElementById("btn-role-student");
    const btnRoleAdmin = document.getElementById("btn-role-admin");
    const loginHint = document.getElementById("login-hint");
    let currentLoginRole = 'student';

    btnRoleStudent.addEventListener("click", () => {
        currentLoginRole = 'student';
        btnRoleStudent.style.background = 'var(--primary)';
        btnRoleStudent.style.borderColor = 'var(--primary)';
        btnRoleAdmin.style.background = 'var(--text-muted)';
        btnRoleAdmin.style.borderColor = 'var(--text-muted)';
        loginHint.style.display = 'block';
        loginUsernameInput.placeholder = "Ingresa tu usuario";
    });

    btnRoleAdmin.addEventListener("click", () => {
        currentLoginRole = 'admin';
        btnRoleAdmin.style.background = 'var(--primary)';
        btnRoleAdmin.style.borderColor = 'var(--primary)';
        btnRoleStudent.style.background = 'var(--text-muted)';
        btnRoleStudent.style.borderColor = 'var(--text-muted)';
        loginHint.style.display = 'none';
        loginUsernameInput.placeholder = "Ej: admin";
    });

    // Admin Elements
    const adminForm = document.getElementById("admin-form");
    const btnResetAdmin = document.getElementById("btn-reset-admin");
    const btnRefreshAdmin = document.getElementById("btn-refresh-admin");
    const btnResetStudents = document.getElementById("btn-reset-students");
    const btnResetAllCredentials = document.getElementById("btn-reset-all-credentials");

    // Student globals
    const mtdInput = document.getElementById("mtd");
    const costAdjInput = document.getElementById("cost_adj");
    const marketingAdjInput = document.getElementById("marketing_adj");
    const taxInput = document.getElementById("tax");
    const prodCostInput = document.getElementById("prod_cost");
    const r2ProdCostT1 = document.getElementById("r2_prod_cost_t1");
    const r2ProdCostT1Tech = document.getElementById("r2_prod_cost_t1_tech");
    const r2ProdCostT2 = document.getElementById("r2_prod_cost_t2");
    const tech2CostInput = document.getElementById("tech2_cost");

    // View elements
    const form = document.getElementById("sim-form");
    const errorBox = document.getElementById("error-message");
    const priceInput = document.getElementById("price");

    // Chart elements
    let rankingChartUnits = null;
    let rankingChartProfit = null;
    let rankingChartROI = null;
    let studentCharts = { breakdown: {}, profitability: {} };

    // Consts (Motor de Mercado)
    const WP = 0.6;
    const WM = 0.4;
    const SUB_CAP = 300;
    const SUB_PENALTY = 1.5;
    const INITIAL_INVESTMENT = 500000;
    const AMORTIZATION = 25000;
    const formatCurr = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    let currentRound = 1;
    let currentUserGroup = null;

    // --- DOM CLONING FOR RESULTS ---
    const r1Panel = document.getElementById("results-panel");
    if(r1Panel && !document.getElementById("results-panel_r1")) {
        const r2Panel = r1Panel.cloneNode(true);
        r2Panel.id = "results-panel_r2";
        r2Panel.querySelectorAll('[id]').forEach(el => el.id = el.id + "_r2");
        const r2H2 = r2Panel.querySelector("h2");
        if (r2H2) r2H2.innerHTML = 'Resultados de la <span class="round-badge r2">Ronda 2</span>';
        r1Panel.parentNode.appendChild(r2Panel);

        r1Panel.id = "results-panel_r1";
        r1Panel.querySelectorAll('[id]').forEach(el => el.id = el.id + "_r1");
        const r1H2 = r1Panel.querySelector("h2");
        if (r1H2) r1H2.innerHTML = 'Resultados de la <span class="round-badge">Ronda 1</span>';
    }

    // --- LOCAL STORAGE UTILS ---
    function getAdminConfig() {
        return JSON.parse(localStorage.getItem('adminConfig')) || {
            mtd: 5000, mtd_r2: 7500, cost_adj: 0, marketing_adj: 0, tax: 30,
            interest_st: 5,
            prod_cost_r1_t1: 50, prod_cost_r2_t1: 50, prod_cost_r2_t2: 60, tech2_cost: 30000,
            maintenance_cost: 2.50,
            cant_grupos: 3,
            enable_r2: false,
            admin_user: 'admin', admin_pass: 'admin123'
        };
    }
    function saveAdminConfig(config) {
        localStorage.setItem('adminConfig', JSON.stringify(config));
    }
    function getStudentUsers() {
        return JSON.parse(localStorage.getItem('studentUsers')) || {};
    }
    function saveStudentUsers(users) {
        localStorage.setItem('studentUsers', JSON.stringify(users));
    }
    function getGroupsData(round) {
        const key = round === 1 ? 'groupsData' : 'groupsDataR2';
        return JSON.parse(localStorage.getItem(key)) || [];
    }
    function saveGroupsData(data, round) {
        const key = round === 1 ? 'groupsData' : 'groupsDataR2';
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- LOGIN LOGIC ---
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        loginError.classList.add("hidden");
        const user = loginUsernameInput.value.trim();
        const pwd = loginPasswordInput.value;

        if (!user || !pwd) {
            showErrorLogin("Debes ingresar usuario y contraseña.");
            return;
        }

        const adminConf = getAdminConfig();
        // Allow case insensitive Admin login check if the user is typing "admin"
        const configuredAdminUser = (adminConf.admin_user || 'admin').trim().toLowerCase();
        const configuredAdminPass = (adminConf.admin_pass || 'admin123').trim();

        // EMERGENCY RESET
        if (user.toLowerCase() === 'reset' && pwd === 'cris2026') {
            localStorage.removeItem('adminConfig');
            localStorage.removeItem('studentUsers');
            localStorage.removeItem('groupsData');
            localStorage.removeItem('groupsDataR2');
            alert("Sistema reseteado a valores de fábrica. Todo el almacenamiento se borró. La página se recargará.");
            location.reload();
            return;
        }

        if (currentLoginRole === 'admin') {
            if (user.toLowerCase() === configuredAdminUser && pwd.trim() === configuredAdminPass) {
                loginUsernameInput.value = "";
                loginPasswordInput.value = "";
                showScreen("admin");
                loadAdminForm();
                updateChartsGlobal();
            } else {
                showErrorLogin(`Credenciales incorrectas. Ingresaste user:"${user}" pass:"${pwd}". El sistema espera user:"${configuredAdminUser}" pass:"${configuredAdminPass}". Revise espacios.`);
            }
        } else {
            if (user.toLowerCase() === configuredAdminUser) {
                showErrorLogin("Este usuario está reservado para el administrador.");
                return;
            }
            const studentUsers = getStudentUsers();

            if (studentUsers[user]) {
                if (studentUsers[user].password === pwd) {
                    loginUsernameInput.value = "";
                    loginPasswordInput.value = "";
                    currentUserGroup = user;
                    const gn = studentUsers[user].groupNumber;
                    document.getElementById("group_name").value = `Grupo ${gn} - ${currentUserGroup}`;
                    const gnText = document.getElementById("group_name_text");
                    if (gnText) gnText.textContent = `Grupo ${gn}: ${currentUserGroup}`;
                    showScreen("student");
                    loadStudentView();
                } else {
                    showErrorLogin("La contraseña de este grupo es incorrecta.");
                }
            } else {
                if (Object.keys(studentUsers).length >= 5) {
                    showErrorLogin("Ya están registrados los 5 grupos permitidos para esta simulación.");
                } else {
                    const groupNum = Object.keys(studentUsers).length + 1;
                    studentUsers[user] = { password: pwd, groupNumber: groupNum };
                    saveStudentUsers(studentUsers);
                    loginUsernameInput.value = "";
                    loginPasswordInput.value = "";
                    currentUserGroup = user;
                    document.getElementById("group_name").value = `Grupo ${groupNum} - ${currentUserGroup}`;
                    const gnText = document.getElementById("group_name_text");
                    if (gnText) gnText.textContent = `Grupo ${groupNum}: ${currentUserGroup}`;
                    showScreen("student");
                    loadStudentView();
                }
            }
        }
    });

    function showErrorLogin(msg) {
        loginError.innerText = msg;
        loginError.classList.remove("hidden");
    }

    btnLogoutAdmin.addEventListener("click", () => { showScreen("login"); });

    function showScreen(screen) {
        loginScreen.classList.remove("active");
        adminScreen.classList.remove("active");
        studentScreen.classList.remove("active");

        if (screen === "login") {
            loginScreen.classList.add("active");
        } else if (screen === "admin") {
            adminScreen.classList.add("active");
        } else if (screen === "student") {
            studentScreen.classList.add("active");
        }
    }

    // --- ADMIN LOGIC ---
    function loadAdminForm() {
        const conf = getAdminConfig();
        document.getElementById("admin_user").value = conf.admin_user || 'admin';
        document.getElementById("admin_pass").value = conf.admin_pass || 'admin123';
        document.getElementById("admin_mtd").value = conf.mtd;
        document.getElementById("admin_mtd_r2").value = conf.mtd_r2 || 7500;
        document.getElementById("admin_cost_adj").value = conf.cost_adj;
        document.getElementById("admin_marketing_adj").value = conf.marketing_adj;
        document.getElementById("admin_tax").value = conf.tax;
        document.getElementById("admin_interest_st").value = conf.interest_st !== undefined ? conf.interest_st : 5;
        document.getElementById("admin_prod_cost_r1_t1").value = conf.prod_cost_r1_t1 || 50;
        document.getElementById("admin_prod_cost_r2_t1").value = conf.prod_cost_r2_t1 || 50;
        document.getElementById("admin_prod_cost_r2_t2").value = conf.prod_cost_r2_t2 || 60;
        document.getElementById("admin_tech2_cost").value = conf.tech2_cost;
        const adminMaintEl = document.getElementById("admin_maintenance_cost");
        if (adminMaintEl) adminMaintEl.value = conf.maintenance_cost !== undefined ? conf.maintenance_cost : 2.50;
        const cantGruposEl = document.getElementById("admin_cant_grupos");
        if (cantGruposEl) cantGruposEl.value = conf.cant_grupos || 3;

        const enableR2El = document.getElementById("admin_enable_r2");
        if (enableR2El) {
            enableR2El.checked = conf.enable_r2 || false;
            const lbl = document.getElementById("admin_r2_label");
            if (lbl) lbl.textContent = enableR2El.checked ? "Habilitada ✅" : "Deshabilitada ❌";
        }

        renderStudentManagement();
    }

    function renderStudentManagement() {
        const listDiv = document.getElementById("student-management-list");
        if (!listDiv) return;
        const studentUsers = getStudentUsers();
        let html = "";
        const keys = Object.keys(studentUsers);
        if (keys.length === 0) {
            html = "<p style='color: var(--text-muted); font-size: 0.9rem;'>No hay grupos registrados todavía.</p>";
        } else {
            keys.forEach(user => {
                const gn = studentUsers[user].groupNumber || '?';
                html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--input-bg); border: 1px solid var(--border); border-radius: 4px;">
                    <span style="font-weight: 600;">Grupo ${gn}: <span style="color: var(--primary);">${user}</span></span>
                    <button type="button" class="btn-primary" style="background: var(--danger); border-color: var(--danger); padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="resetStudentCredential('${user}')">🗑️ Resetear Contraseña</button>
                </div>`;
            });
        }
        listDiv.innerHTML = html;
    }

    window.resetStudentCredential = function(username) {
        if (confirm(`⚠️ ¿Estás seguro de que quieres borrar la contraseña del grupo: ${username}?\nEsto les permitirá ingresar una nueva contraseña la próxima vez que inicien sesión con ese nombre.`)) {
            const studentUsers = getStudentUsers();
            delete studentUsers[username];
            saveStudentUsers(studentUsers);
            renderStudentManagement();
        }
    };

    // Listener en tiempo real para el toggle de Ronda 2 en el panel admin
    const adminEnableR2El = document.getElementById("admin_enable_r2");
    if (adminEnableR2El) {
        adminEnableR2El.addEventListener("change", () => {
            const lbl = document.getElementById("admin_r2_label");
            if (lbl) lbl.textContent = adminEnableR2El.checked ? "Habilitada ✅" : "Deshabilitada ❌";
        });
    }

    adminForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const cantGruposEl = document.getElementById("admin_cant_grupos");
        const enableR2El = document.getElementById("admin_enable_r2");
        const adminMaintEl = document.getElementById("admin_maintenance_cost");
        saveAdminConfig({
            admin_user: document.getElementById("admin_user").value.trim(),
            admin_pass: document.getElementById("admin_pass").value,
            mtd: parseFloat(document.getElementById("admin_mtd").value) || 5000,
            mtd_r2: parseFloat(document.getElementById("admin_mtd_r2").value) || 7500,
            cost_adj: parseFloat(document.getElementById("admin_cost_adj").value) || 0,
            marketing_adj: parseFloat(document.getElementById("admin_marketing_adj").value) || 0,
            tax: parseFloat(document.getElementById("admin_tax").value) || 30,
            interest_st: parseFloat(document.getElementById("admin_interest_st").value) || 0,
            prod_cost_r1_t1: parseFloat(document.getElementById("admin_prod_cost_r1_t1").value) || 50,
            prod_cost_r2_t1: parseFloat(document.getElementById("admin_prod_cost_r2_t1").value) || 50,
            prod_cost_r2_t2: parseFloat(document.getElementById("admin_prod_cost_r2_t2").value) || 60,
            tech2_cost: parseFloat(document.getElementById("admin_tech2_cost").value) || 30000,
            maintenance_cost: parseFloat(adminMaintEl ? adminMaintEl.value : 2.50) || 2.50,
            cant_grupos: parseInt(cantGruposEl ? cantGruposEl.value : 3) || 3,
            enable_r2: enableR2El ? enableR2El.checked : false
        });
        const msg = document.getElementById("admin-msg");
        msg.innerText = "✅ Configuración guardada correctamente en LocalStorage.";
        msg.classList.remove("hidden");
        setTimeout(() => msg.classList.add("hidden"), 3000);
        updateChartsGlobal(); // MTD might have changed
    });

    if (btnResetAllCredentials) {
        btnResetAllCredentials.addEventListener("click", () => {
            if (confirm("⚠️ ¿Estás seguro de que quieres borrar TODAS las contraseñas de los estudiantes?\nEsto NO borrará sus decisiones, solo les permitirá registrar una nueva contraseña al ingresar.")) {
                localStorage.removeItem('studentUsers');
                renderStudentManagement();
                alert("✅ Contraseñas de estudiantes borradas exitosamente.");
            }
        });
    }

    btnResetStudents.addEventListener("click", () => {
        if (confirm("⚠️ ¿Estás seguro de que quieres borrar SOLAMENTE a los Estudiantes? Esto borrará sus cuentas y decisiones pero mantendrá la configuración global del simulador.")) {
            localStorage.removeItem('studentUsers');
            localStorage.removeItem('groupsData');
            localStorage.removeItem('groupsDataR2');
            updateChartsGlobal();
            alert("✅ Estudiantes reiniciados exitosamente.");
        }
    });

    btnResetAdmin.addEventListener("click", () => {
        if (confirm("⚠️ ¿Estás seguro de que quieres borrar TODOS LOS DATOS (Admin incluido)? Esta acción no se puede deshacer.")) {
            localStorage.clear();
            loadAdminForm();
            updateChartsGlobal();
            alert("✅ Simulador reiniciado por completo.");
        }
    });

    btnRefreshAdmin.addEventListener("click", () => {
        updateChartsGlobal();
    });

    // --- STUDENT LOGIC ---
    function loadStudentView() {
        const conf = getAdminConfig();
        document.getElementById("mtd").value = conf.mtd;
        document.getElementById("mtd_r2").value = conf.mtd_r2 || 7500;
        costAdjInput.value = conf.cost_adj;
        marketingAdjInput.value = conf.marketing_adj;
        taxInput.value = conf.tax;
        tech2CostInput.value = conf.tech2_cost;
        const maintDisplay = document.getElementById("maintenance_cost_display");
        if (maintDisplay) maintDisplay.value = conf.maintenance_cost !== undefined ? conf.maintenance_cost : 2.50;

        // Apply admin base cost minimums
        const prodCostEl = document.getElementById("prod_cost");
        if (prodCostEl) {
            prodCostEl.min = conf.prod_cost_r1_t1 || 50;
            if (parseFloat(prodCostEl.value || 0) < (conf.prod_cost_r1_t1 || 50)) prodCostEl.value = conf.prod_cost_r1_t1 || 50;
        }
        const r2ProdT1El = document.getElementById("r2_prod_cost_t1_tech");
        if (r2ProdT1El) {
            r2ProdT1El.min = conf.prod_cost_r2_t1 || 50;
            if (parseFloat(r2ProdT1El.value || 0) < (conf.prod_cost_r2_t1 || 50)) r2ProdT1El.value = conf.prod_cost_r2_t1 || 50;
        }
        const r2ProdT1NoTechEl = document.getElementById("r2_prod_cost_t1");
        if (r2ProdT1NoTechEl) {
            r2ProdT1NoTechEl.min = conf.prod_cost_r2_t1 || 50;
            if (parseFloat(r2ProdT1NoTechEl.value || 0) < (conf.prod_cost_r2_t1 || 50)) r2ProdT1NoTechEl.value = conf.prod_cost_r2_t1 || 50;
        }
        const r2ProdT2El = document.getElementById("r2_prod_cost_t2");
        if (r2ProdT2El) {
            r2ProdT2El.min = conf.prod_cost_r2_t2 || 60;
            if (parseFloat(r2ProdT2El.value || 0) < (conf.prod_cost_r2_t2 || 60)) r2ProdT2El.value = conf.prod_cost_r2_t2 || 60;
        }

        // Always hide strategy card on login — only revealed after "Guardar y Procesar"
        const strategyCard = document.getElementById("strategy-env-card");
        if (strategyCard) strategyCard.classList.add("hidden");
        // Aplicar estado de Ronda 2
        applyR2State(conf.enable_r2 || false);

        updateTech2Badge();
        if (currentRound === 2) adaptRound2Ops();

        tryToShowPreviousResults();
    }

    function applyR2State(enabled) {
        const tabR2 = document.getElementById("tab-r2");
        if (!tabR2) return;
        if (enabled) {
            tabR2.disabled = false;
            tabR2.style.opacity = "1";
            tabR2.style.cursor = "pointer";
            tabR2.title = "";
            // Remove lock badge if any
            const lockBadge = tabR2.querySelector(".r2-lock-badge");
            if (lockBadge) lockBadge.remove();
        } else {
            // If currently on round 2, switch back to round 1
            if (currentRound === 2 || currentRound === 'results') {
                switchRound(1);
            }
            tabR2.disabled = true;
            tabR2.style.opacity = "0.4";
            tabR2.style.cursor = "not-allowed";
            tabR2.title = "El administrador aún no ha habilitado la Ronda 2";
            // Add lock badge if not already there
            if (!tabR2.querySelector(".r2-lock-badge")) {
                const badge = document.createElement("span");
                badge.className = "r2-lock-badge";
                badge.textContent = "🔒 Bloqueada";
                badge.style.cssText = "font-size:0.6rem; background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.3); border-radius:20px; padding:2px 8px; display:block; margin-top:2px;";
                tabR2.appendChild(badge);
            }
        }
    }

    window.switchRound = function (round) {
        // Check if R2 is enabled before allowing switch
        if (round === 2) {
            const conf = getAdminConfig();
            if (!conf.enable_r2) {
                alert("🔒 La Ronda 2 aún no ha sido habilitada por el administrador.");
                return;
            }
        }
        currentRound = round;
        document.getElementById("tab-r1").classList.toggle("active", round === 1);
        document.getElementById("tab-r2").classList.toggle("active", round === 2);
        
        document.getElementById("sim-form").classList.remove("hidden");
        
        const trophyContainer = document.getElementById("winner-trophy-container");
        if(trophyContainer) trophyContainer.classList.add("hidden");

        document.getElementById("ops-r1").classList.toggle("hidden", round !== 1);
        document.getElementById("ops-r2").classList.toggle("hidden", round !== 2);
        document.getElementById("marketing-r1").classList.toggle("hidden", round !== 1);
        document.getElementById("marketing-r2").classList.toggle("hidden", round !== 2);
        document.getElementById("mtd_group_r1").classList.toggle("hidden", round !== 1);
        document.getElementById("mtd_group_r2").classList.toggle("hidden", round !== 2);
        
        document.getElementById("results-round-badge").textContent = `Ronda ${round}`;
        if (round === 2) adaptRound2Ops();
        
        const p1 = document.getElementById("results-panel_r1");
        const p2 = document.getElementById("results-panel_r2");
        if (p1) p1.classList.toggle("hidden", round !== 1);
        if (p2) p2.classList.toggle("hidden", round !== 2);

        errorBox.classList.add("hidden");
        
        const strategyCard = document.getElementById("strategy-env-card");
        if(strategyCard) strategyCard.classList.add("hidden");
        
        tryToShowPreviousResults();
    };

    function adaptRound2Ops() {
        const r1Group = getGroupsData(1).find(g => g.name === currentUserGroup);
        const checkboxEl = document.getElementById("buy_tech2");
        const hasTech2 = (r1Group && r1Group.hasTech2) || (checkboxEl && checkboxEl.checked);
        document.getElementById("ops-r2-no-tech2").classList.toggle("hidden", hasTech2);
        document.getElementById("ops-r2-with-tech2").classList.toggle("hidden", !hasTech2);
        const marketingT2 = document.getElementById("marketing-r2-tech2");
        if (marketingT2) marketingT2.classList.toggle("hidden", !hasTech2);
    }

    function updateTech2Badge() {
        const conf = getAdminConfig();
        const tech2CostBadge = document.getElementById("tech2-cost-badge");
        tech2CostBadge.textContent = formatCurr(conf.tech2_cost);
    }

    // Toggle short term debt tech2 hint
    const buyTech2Checkbox = document.getElementById("buy_tech2");
    buyTech2Checkbox.addEventListener("change", () => {
        const hint = document.getElementById("short-term-tech2-hint");
        if (hint) hint.style.display = buyTech2Checkbox.checked ? "block" : "none";
        
        // Dynamic update for R2 if they switch tabs without saving
        adaptRound2Ops();
    });

    const btnPreview = document.getElementById("btn-preview");
    if (btnPreview) {
        btnPreview.addEventListener("click", () => {
            // No strict form validity check here because hidden inputs block it
            errorBox.classList.add("hidden");
            errorBox.innerText = "";
            hideSaveSuccess();
            if (currentRound === 1) processRound1(true);
            else processRound2(true);
        });
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorBox.classList.add("hidden");
        errorBox.innerText = "";
        hideSaveSuccess();

        if (currentRound === 1) {
            processRound1(false);
        } else {
            processRound2(false);
        }
    });

    function showSaveSuccess(msg) {
        const el = document.getElementById("save-success-msg");
        if (!el) return;
        el.innerText = msg;
        el.classList.remove("hidden");
        el.style.opacity = "1";
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(() => {
            el.style.transition = "opacity 0.8s";
            el.style.opacity = "0";
            setTimeout(() => { el.classList.add("hidden"); el.style.opacity = "1"; el.style.transition = ""; }, 800);
        }, 4000);
        // Hide preview banner when saving
        const banner = document.getElementById("preview-mode-banner");
        if (banner) banner.classList.add("hidden");
    }

    function hideSaveSuccess() {
        const el = document.getElementById("save-success-msg");
        if (el) { el.classList.add("hidden"); el.style.opacity = "1"; }
    }

    function showPreviewBanner() {
        const sf = currentRound === 1 ? "_r1" : "_r2";
        const banner = getEl("preview-mode-banner", sf);
        if (banner) banner.classList.remove("hidden");
    }
    function hidePreviewBanner() {
        const sf = currentRound === 1 ? "_r1" : "_r2";
        const banner = getEl("preview-mode-banner", sf);
        if (banner) banner.classList.add("hidden");
    }

    // --- FORMULAS ---
    // Nueva fórmula: Ai = [(1000/P) + (Mkt * 0.2)] * HR
    // HR = 1 + ((capacitacion + salario_total) / 5000)
    function calcIA(price, marketingSpend, trainingBudget, totalSalary) {
        if (!price || price <= 0) return 0;
        const base = (1000 / price) + (marketingSpend * 0.2);
        const HR = 1 + (((trainingBudget || 0) + (totalSalary || 0)) / 5000);
        return base * HR;
    }

    // Calcula el multiplicador HR separado (para mostrar en UI)
    function calcHR(trainingBudget, totalSalary) {
        return 1 + (((trainingBudget || 0) + (totalSalary || 0)) / 5000);
    }

    function calcAllDemands(sourceResults, mtd) {
        if (sourceResults.length === 0) return [];
        let avgP = 0, avgA = 0, avgC = 0;
        sourceResults.forEach(g => {
            avgP += g.price || 0;
            avgA += g.marketingSpend || 0;
            avgC += g.trainingBudget || 0;
        });
        avgP /= sourceResults.length;
        avgA /= sourceResults.length;
        avgC /= sourceResults.length;

        let totalIA = 0;
        sourceResults.forEach(g => {
            const P = g.price || 1; // evitar division por 0
            const A = g.marketingSpend || 0;
            const C = g.trainingBudget || 0;
            
            const termP = (avgP / P) * 0.5;
            const termA = avgA > 0 ? (A / avgA) * 0.3 : 0;
            const termC = avgC > 0 ? (C / avgC) * 0.2 : 0;
            
            g.ia = termP + termA + termC;
            totalIA += g.ia;
        });

        if (totalIA === 0) return sourceResults.map(g => ({ name: g.name, dr: 0 }));

        const demands = sourceResults.map(g => {
            const vp = Math.round((g.ia / totalIA) * mtd);
            return { name: g.name, dr: vp, ia: g.ia };
        });

        const total = demands.reduce((s, d) => s + d.dr, 0);
        const diff = mtd - total;
        if (diff !== 0 && demands.length > 0) {
            const topGroup = demands.reduce((prev, cur) => cur.ia > prev.ia ? cur : prev);
            topGroup.dr += diff;
        }

        return demands;
    }

    function calcAllDemandsR2(sourceResults, mtd_r2) {
        if (sourceResults.length === 0) return [];
        let avgP_T1 = 0, avgP_T2 = 0, avgA = 0, avgC = 0;
        let countT1 = 0, countT2 = 0;
        sourceResults.forEach(g => {
            avgP_T1 += g.priceT1 || 0; countT1++;
            if (g.hasTech2) { avgP_T2 += g.priceT2 || 0; countT2++; }
            avgA += g.marketingSpend || 0;
            avgC += g.trainingBudget || 0;
        });
        avgP_T1 = countT1 > 0 ? avgP_T1 / countT1 : 0;
        avgP_T2 = countT2 > 0 ? avgP_T2 / countT2 : 0;
        avgA /= sourceResults.length;
        avgC /= sourceResults.length;

        let totalIA = 0;
        sourceResults.forEach(g => {
            const P1 = g.priceT1 || 1;
            const A = g.marketingSpend || 0;
            const C = g.trainingBudget || 0;

            const termA = avgA > 0 ? (A / avgA) * 0.3 : 0;
            const termC = avgC > 0 ? (C / avgC) * 0.2 : 0;

            const termP1 = (avgP_T1 / P1) * 0.5;
            g.ia_t1 = termP1 + termA + termC;
            totalIA += g.ia_t1;

            if (g.hasTech2) {
                const P2 = g.priceT2 || 1;
                const termP2 = (avgP_T2 / P2) * 0.5;
                g.ia_t2 = termP2 + termA + termC;
                totalIA += g.ia_t2;
            } else {
                g.ia_t2 = 0;
            }
        });

        if (totalIA === 0) return sourceResults.map(g => ({ name: g.name, dr_t1: 0, dr_t2: 0 }));

        const demands = sourceResults.map(g => {
            const vp_t1 = Math.round((g.ia_t1 / totalIA) * mtd_r2);
            const vp_t2 = Math.round((g.ia_t2 / totalIA) * mtd_r2);
            return { name: g.name, dr_t1: vp_t1, dr_t2: vp_t2, total_ia: g.ia_t1 + g.ia_t2 };
        });

        const total = demands.reduce((s, d) => s + d.dr_t1 + d.dr_t2, 0);
        const diff = mtd_r2 - total;
        if (diff !== 0 && demands.length > 0) {
            const topGroup = demands.reduce((prev, cur) => cur.total_ia > prev.total_ia ? cur : prev);
            if (topGroup.dr_t2 > 0) topGroup.dr_t2 += diff;
            else topGroup.dr_t1 += diff;
        }

        return demands;
    }

    // --- ROUND 1 PROCESS ---
    function processRound1(isPreview = false) {
        const conf = getAdminConfig();
        const mtd = conf.mtd;

        const price = parseFloat(document.getElementById("price").value) || 0;
        const estimatedSales = parseInt(document.getElementById("estimated_sales").value) || 0;
        const marketingSpend = parseFloat(document.getElementById("marketing_spend").value) || 0;
        const plantUnits = parseInt(document.getElementById("plant_units").value) || 0;
        const subUnits = parseInt(document.getElementById("sub_units").value) || 0;
        const inputProdCost = parseFloat(document.getElementById("prod_cost").value) || 50;

        const employees = parseInt(document.getElementById("employees").value) || 0;
        const salaryPerEmployee = parseFloat(document.getElementById("salary_per_employee").value) || 0;
        const trainingBudget = parseFloat(document.getElementById("training_budget").value) || 0;
        const shortTermDebt = parseFloat(document.getElementById("short_term_debt").value) || 0;
        // Maintenance cost is now set by Admin
        const maintenanceCostPerUnit = conf.maintenance_cost !== undefined ? conf.maintenance_cost : 2.50;

        const buyTech2 = document.getElementById("buy_tech2").checked;

        if (plantUnits > 2000) { showError("❌ La capacidad máxima de la planta es 2000 unidades."); return; }
        if (subUnits > 500) { showError("❌ El máximo a subcontratar son 500 unidades."); return; }
        if (price <= 0) { showError("❌ El precio de venta no puede ser cero o negativo."); return; }

        const minProdCostR1T1 = conf.prod_cost_r1_t1 || 50;
        if (inputProdCost < minProdCostR1T1) { showError(`❌ El costo de producción mínimo permitido es $${minProdCostR1T1}.`); return; }

        const totalSalary = employees * salaryPerEmployee;
        const ia = calcIA(price, marketingSpend, trainingBudget, totalSalary);

        const groupData = {
            name: currentUserGroup, price, marketingSpend, ia,
            plantUnits, subUnits, prodCost: inputProdCost, estimatedSales,
            employees, salaryPerEmployee, trainingBudget,
            shortTermDebt, baseShortTermDebt: shortTermDebt, maintenanceCostPerUnit,
            tax: conf.tax, interest_st: conf.interest_st, costAdj: conf.cost_adj, marketingAdj: conf.marketing_adj, mtd,
            buyTech2, tech2Cost: conf.tech2_cost, tech2FinancingGap: 0, hasTech2: false
        };

        const groupsData = getGroupsData(1);
        const existingIdx = groupsData.findIndex(g => g.name === currentUserGroup);

        const tempResults = [...groupsData];
        if (existingIdx !== -1) tempResults[existingIdx] = groupData;
        else tempResults.push(groupData);

        // PREVIEW: use student's own estimate as demand (no market competition)
        // SAVE: use competitive market allocation (adjusts as other groups save)
        let myDR;
        if (isPreview) {
            myDR = estimatedSales;
        } else {
            const tempDemands = calcAllDemands(tempResults, mtd);
            myDR = tempDemands.find(d => d.name === currentUserGroup).dr;
        }

        // Calculate initial financials WITHOUT tech 2 first to check NP
        groupData.hasTech2 = false; 
        const fBeforeTech2 = calcGroupFinancials(groupData, myDR);

        if (buyTech2) {
            groupData.hasTech2 = true;
            const applicableProfit = Math.max(0, fBeforeTech2.netProfit);
            if (applicableProfit < conf.tech2_cost) {
                const gap = conf.tech2_cost - applicableProfit;
                groupData.shortTermDebt = (groupData.shortTermDebt || 0) + gap;
                if (!isPreview) {
                    alert(`💡 Utilidad Neta insuficiente para cubrir el total. Se tomó deuda a corto plazo automática por $${gap.toFixed(2)} para adquirir la Tecnología 2.`);
                }
            }
        }

        if (!isPreview) {
            if (existingIdx !== -1) groupsData[existingIdx] = groupData;
            else groupsData.push(groupData);
            saveGroupsData(tempResults, 1);
            
            // Strategy SHOULD NOT be visible yet if waiting
            // Moved to bottom when actually showing results

            if (tempResults.length < conf.cant_grupos) {
                showSaveSuccess(`✅ Decisiones guardadas. ¡Faltan ${conf.cant_grupos - tempResults.length} grupo(s) para cerrar el mercado!`);
                const ws = getEl("waiting-state", "_r1");
                if (ws) ws.classList.remove("hidden");

                const strategyCard = document.getElementById("strategy-env-card");
                if (strategyCard) strategyCard.classList.add("hidden");

                getEl("empty-state", "_r1").classList.add("hidden");
                getEl("results-data", "_r1").classList.add("hidden");
                return; // Stop processing, wait for all
            }

            showSaveSuccess("✅ ¡Todos los grupos listos! Resultados del mercado R1 procesados.");
            let ws = getEl("waiting-state", "_r1");
            if (ws) ws.classList.add("hidden");
        } else {
            let ws = getEl("waiting-state", "_r1");
            if (ws) ws.classList.add("hidden");
        }

        // Recalculate with final debt and tech2 expense
        const finalF = calcGroupFinancials(groupData, myDR);
        let myIVC = 0;
        if (!isPreview) {
            const dr_total = myDR;
            const mtd_total = conf.mtd;
            myIVC = calculateIVC(finalF, null, mtd_total, dr_total, finalF.effectiveSubUnits > 500);
        }

        if (isPreview) {
            showPreviewBanner();
            const strategyCard = document.getElementById("strategy-env-card");
            if (strategyCard) strategyCard.classList.add("hidden");
        } else {
            hidePreviewBanner();
            const strategyCard = document.getElementById("strategy-env-card");
            if (strategyCard) strategyCard.classList.remove("hidden");
        }

        const r1Panel = document.getElementById("results-panel_r1");
        if (r1Panel) r1Panel.classList.remove("hidden");

        updateResultsUI_R1(finalF, groupData, myDR, 0, groupData.hasTech2, conf.tech2_cost, "_r1", myIVC);
        updateInsights(finalF, groupData, myDR, tempResults.length, mtd, "_r1");
        updateMarketAnalysisUI(groupData, finalF.soldUnits, 1, finalF.soldUnits, 0);
        renderStudentCharts(finalF, "_r1");
        getEl("empty-state", "_r1").classList.add("hidden");
        getEl("results-data", "_r1").classList.remove("hidden");
    }

    // --- ROUND 2 PROCESS ---
    function processRound2(isPreview = false) {
        const conf = getAdminConfig();
        const mtd = conf.mtd;

        const r1Data = getGroupsData(1).find(g => g.name === currentUserGroup);
        if (!r1Data) {
            showError("❌ Debes completar y guardar la Ronda 1 primero.");
            return;
        }

        const priceT1 = parseFloat(document.getElementById("r2_price_t1").value) || 0;
        const estimatedSalesT1 = parseInt(document.getElementById("r2_estimated_sales_t1").value) || 0;
        let priceT2 = 0;
        let estimatedSalesT2 = 0;
        
        if (r1Data.hasTech2) {
            priceT2 = parseFloat(document.getElementById("r2_price_t2").value) || 0;
            estimatedSalesT2 = parseInt(document.getElementById("r2_estimated_sales_t2").value) || 0;
        }

        const marketingSpend = parseFloat(document.getElementById("r2_marketing_spend").value) || 0;

        const employees = parseInt(document.getElementById("employees").value) || 0;
        const salaryPerEmployee = parseFloat(document.getElementById("salary_per_employee").value) || 0;
        const trainingBudget = parseFloat(document.getElementById("training_budget").value) || 0;
        const shortTermDebt = parseFloat(document.getElementById("short_term_debt").value) || 0;
        // Maintenance cost is now set by Admin
        const maintenanceCostPerUnit = conf.maintenance_cost !== undefined ? conf.maintenance_cost : 2.50;

        let inputProdCostT1 = 50, inputProdCostT2 = 0;
        let plantT1 = 0, plantT2 = 0, subT1 = 0, subT2 = 0;

        if (r1Data.hasTech2) {
            inputProdCostT1 = parseFloat(document.getElementById("r2_prod_cost_t1_tech").value) || 50;
            inputProdCostT2 = parseFloat(document.getElementById("r2_prod_cost_t2").value) || 60;
            plantT1 = parseInt(document.getElementById("r2_plant_units_t1").value) || 0;
            subT1 = parseInt(document.getElementById("r2_sub_units_t1").value) || 0;
            plantT2 = parseInt(document.getElementById("r2_plant_units_t2").value) || 0;
            subT2 = parseInt(document.getElementById("r2_sub_units_t2").value) || 0;
        } else {
            inputProdCostT1 = parseFloat(document.getElementById("r2_prod_cost_t1").value) || 50;
            plantT1 = parseInt(document.getElementById("r2_plant_units_t1_no_tech").value) || 0;
            subT1 = parseInt(document.getElementById("r2_sub_units_t1_no_tech").value) || 0;
        }

        if (priceT1 <= 0 || (r1Data.hasTech2 && priceT2 <= 0)) { showError("❌ El precio de venta no puede ser cero o negativo."); return; }
        if (subT1 > 500) { showError("❌ El máximo a subcontratar para Tec 1 son 500 unidades."); return; }
        if (r1Data.hasTech2 && subT2 > 500) { showError("❌ El máximo a subcontratar para Tec 2 son 500 unidades."); return; }

        const minProdCostR2T1 = conf.prod_cost_r2_t1 || 50;
        if (inputProdCostT1 < minProdCostR2T1) { showError(`❌ El costo de producción mínimo para Tec 1 es $${minProdCostR2T1}.`); return; }
        if (r1Data.hasTech2) {
            const minProdCostR2T2 = conf.prod_cost_r2_t2 || 60;
            if (inputProdCostT2 < minProdCostR2T2) { showError(`❌ El costo de producción mínimo para Tec 2 es $${minProdCostR2T2}.`); return; }
        }

        const totalSalary = employees * salaryPerEmployee;
        const ia_t1 = calcIA(priceT1, marketingSpend, trainingBudget, totalSalary);
        const ia_t2 = r1Data.hasTech2 ? calcIA(priceT2, marketingSpend, trainingBudget, totalSalary) * 1.25 : 0; // 25% bonus for Tech 2
        
        const ia = ia_t1 + ia_t2;

        const groupData = {
            name: currentUserGroup, 
            priceT1, priceT2, 
            estimatedSalesT1, estimatedSalesT2, 
            marketingSpend, ia_t1, ia_t2, ia,
            plantT1, plantT2, subT1, subT2,
            employees, salaryPerEmployee, trainingBudget,
            shortTermDebt, maintenanceCostPerUnit,
            tax: conf.tax, interest_st: conf.interest_st, costAdj: conf.cost_adj, marketingAdj: conf.marketing_adj, mtd_r2: conf.mtd_r2,
            hasTech2: r1Data.hasTech2,
            prodCostT1: inputProdCostT1, prodCostT2: inputProdCostT2
        };

        const groupsDataR2 = getGroupsData(2);
        const existingIdx = groupsDataR2.findIndex(g => g.name === currentUserGroup);

        const tempResults = [...groupsDataR2];
        if (existingIdx !== -1) tempResults[existingIdx] = groupData;
        else tempResults.push(groupData);

        // PREVIEW: use student's own estimates as demand per technology
        // SAVE: use competitive market allocation (adjusts as other groups save)
        let myDemands;
        if (isPreview) {
            myDemands = { dr_t1: estimatedSalesT1, dr_t2: estimatedSalesT2 };
        } else {
            const tempDemands = calcAllDemandsR2(tempResults, conf.mtd_r2 || 7500);
            myDemands = tempDemands.find(d => d.name === currentUserGroup);
        }

        const myF = calcGroupFinancials_R2(groupData, myDemands.dr_t1, myDemands.dr_t2);

        if (!isPreview) {
            if (existingIdx !== -1) groupsDataR2[existingIdx] = groupData;
            else groupsDataR2.push(groupData);        
            saveGroupsData(tempResults, 2);
            
            if (tempResults.length < conf.cant_grupos) {
                showSaveSuccess(`✅ Decisiones guardadas. ¡Faltan ${conf.cant_grupos - tempResults.length} grupo(s) para cerrar el mercado!`);
                const ws = getEl("waiting-state", "_r2");
                if (ws) ws.classList.remove("hidden");
                const strategyCard = document.getElementById("strategy-env-card");
                if (strategyCard) strategyCard.classList.add("hidden");
                getEl("empty-state", "_r2").classList.add("hidden");
                getEl("results-data", "_r2").classList.add("hidden");
                return; // Stop processing, wait for all
            }

            const strategyCard = document.getElementById("strategy-env-card");
            if (strategyCard) strategyCard.classList.remove("hidden");
            checkAndShowTrophy(getGroupsData(1), getGroupsData(2), conf);
            showSaveSuccess("✅ ¡Todos los grupos listos! Resultados del mercado R2 procesados.");
            const ws = getEl("waiting-state", "_r2");
            if (ws) ws.classList.add("hidden");
        } else {
            const ws = getEl("waiting-state", "_r2");
            if (ws) ws.classList.add("hidden");
        }

        if (isPreview) {
            showPreviewBanner();
            const strategyCard = document.getElementById("strategy-env-card");
            if (strategyCard) strategyCard.classList.add("hidden");
        } else {
            hidePreviewBanner();
        }

        // Show the cloned panel
        const r2Panel = document.getElementById("results-panel_r2");
        if (r2Panel) r2Panel.classList.remove("hidden");

        let f1 = null;
        let myIVC = 0;
        if (r1Data) {
            const g1 = getGroupsData(1);
            const allDemands1 = calcAllDemands(g1, conf.mtd);
            const myDR1 = allDemands1.find(d => d.name === currentUserGroup)?.dr || 0;
            f1 = calcGroupFinancials(r1Data, myDR1);
            
            if (!isPreview) {
                const mtd_total = conf.mtd + (conf.mtd_r2 || 7500);
                const dr_total = myDR1 + myDemands.dr_t1 + myDemands.dr_t2;
                const sub_maxed = (myF.effectiveSubUnits >= 300) || ((groupData.subUnitsT1 || 0) + (groupData.subUnitsT2 || 0) >= 300);
                myIVC = calculateIVC(f1, myF, mtd_total, dr_total, sub_maxed);
            }
        }

        updateResultsUI_R2(myF, groupData, myDemands.dr_t1 + myDemands.dr_t2, "_r2", f1, myIVC);
        updateInsights(myF, groupData, myDemands.dr_t1 + myDemands.dr_t2, tempResults.length, conf.mtd_r2, "_r2");
        updateMarketAnalysisUI(groupData, myF.soldUnits, 2, myF.soldUnitsT1, myF.soldUnitsT2);
        renderStudentCharts(myF, "_r2");
        getEl("empty-state", "_r2").classList.add("hidden");
        getEl("results-data", "_r2").classList.remove("hidden");
    }

    function tryToShowPreviousResults() {
        if (!currentUserGroup) return;
        const groupsData = getGroupsData(currentRound);
        const myData = groupsData.find(g => g.name === currentUserGroup);

        if (myData) {
            const conf = getAdminConfig();
            hidePreviewBanner(); // Saved data always hides the preview indicator
            
            const sff = currentRound === 1 ? "_r1" : "_r2";
            const ws = getEl("waiting-state", sff);
            const panel = document.getElementById("results-panel" + sff);
            if (panel) panel.classList.remove("hidden");

            if (groupsData.length < conf.cant_grupos) {
                if (ws) ws.classList.remove("hidden");
                const strategyCard = document.getElementById("strategy-env-card");
                if (strategyCard) strategyCard.classList.add("hidden");
                showPreviewBanner();

                if (currentRound === 1) {
                    const myDRp = myData.estimatedSales || 0;
                    const fPreview = calcGroupFinancials(myData, myDRp);
                    updateResultsUI_R1(fPreview, myData, myDRp, 0, myData.hasTech2, myData.tech2Cost, "_r1");
                    updateInsights(fPreview, myData, myDRp, groupsData.length, conf.mtd, "_r1");
                    updateMarketAnalysisUI(myData, fPreview.soldUnits, 1, fPreview.soldUnits, 0);
                    renderStudentCharts(fPreview, "_r1");
                } else {
                    const drT1 = myData.estimatedSalesT1 || 0;
                    const drT2 = myData.hasTech2 ? (myData.estimatedSalesT2 || 0) : 0;
                    const fPreview = calcGroupFinancials_R2(myData, drT1, drT2);
                    let f1Pre = null;
                    const g1 = getGroupsData(1);
                    const myData1 = g1.find(g => g.name === currentUserGroup);
                    if (myData1) {
                        const allD1 = calcAllDemands(g1, conf.mtd);
                        f1Pre = calcGroupFinancials(myData1, allD1.find(d => d.name === currentUserGroup)?.dr || 0);
                    }
                    updateResultsUI_R2(fPreview, myData, drT1 + drT2, "_r2", f1Pre);
                    updateInsights(fPreview, myData, drT1 + drT2, groupsData.length, conf.mtd_r2 || 7500, "_r2");
                    updateMarketAnalysisUI(myData, fPreview.soldUnits, 2, fPreview.soldUnitsT1, fPreview.soldUnitsT2);
                    renderStudentCharts(fPreview, "_r2");
                }

                getEl("empty-state", sff).classList.add("hidden");
                getEl("results-data", sff).classList.remove("hidden");
                return;
            }

            if (ws) ws.classList.add("hidden");
            const strategyCard = document.getElementById("strategy-env-card");
            if (strategyCard) strategyCard.classList.remove("hidden");

            let f, myDRval;
            if (currentRound === 1) {
                const allDemands = calcAllDemands(groupsData, conf.mtd);
                const myDR = allDemands.find(d => d.name === currentUserGroup).dr;
                myDRval = myDR;
                let myIVC = 0;
                f = calcGroupFinancials(myData, myDR);
                myIVC = calculateIVC(f, null, conf.mtd, myDRval, f.effectiveSubUnits > 500);
                updateResultsUI_R1(f, myData, myDR, myData.tech2FinancingGap, myData.hasTech2, myData.tech2Cost, "_r1", myIVC);
                updateInsights(f, myData, myDR, groupsData.length, conf.mtd, "_r1");
                updateMarketAnalysisUI(myData, f.soldUnits, 1, f.soldUnits, 0);
            } else {
                const allDemands = calcAllDemandsR2(groupsData, conf.mtd_r2 || 7500);
                const myDemands = allDemands.find(d => d.name === currentUserGroup);
                myDRval = myDemands.dr_t1 + myDemands.dr_t2;
                const g1 = getGroupsData(1);
                const myData1 = g1.find(g => g.name === currentUserGroup);
                let f1 = null;
                let myIVC = 0;
                f = calcGroupFinancials_R2(myData, myDemands.dr_t1, myDemands.dr_t2);
                if (myData1) {
                    const allDemands1 = calcAllDemands(g1, conf.mtd);
                    const myDR1 = allDemands1.find(d => d.name === currentUserGroup)?.dr || 0;
                    f1 = calcGroupFinancials(myData1, myDR1);
                    
                    const mtd_total = conf.mtd + (conf.mtd_r2 || 7500);
                    const dr_total = myDR1 + myDRval;
                    const sub_maxed = (f.effectiveSubUnits >= 300) || ((myData.subUnitsT1 || 0) + (myData.subUnitsT2 || 0) >= 300);
                    myIVC = calculateIVC(f1, f, mtd_total, dr_total, sub_maxed);
                }
                updateResultsUI_R2(f, myData, myDRval, "_r2", f1, myIVC);
                updateInsights(f, myData, myDRval, groupsData.length, conf.mtd_r2, "_r2");
                updateMarketAnalysisUI(myData, f.soldUnits, 2, f.soldUnitsT1, f.soldUnitsT2);
            }
            getEl("empty-state", sff).classList.add("hidden");
            const wsEnd = getEl("waiting-state", sff);
            if (wsEnd) wsEnd.classList.add("hidden");
            getEl("results-data", sff).classList.remove("hidden");
            
            if (currentRound === 2 || (currentRound === 1 && getGroupsData(2).length >= conf.cant_grupos)) {
                checkAndShowTrophy(getGroupsData(1), getGroupsData(2), conf);
            }
        } else {
            const sff = currentRound === 1 ? "_r1" : "_r2";
            getEl("results-data", sff).classList.add("hidden");
            const wsEnd2 = getEl("waiting-state", sff);
            if (wsEnd2) wsEnd2.classList.add("hidden");
            const strategyCard = document.getElementById("strategy-env-card");
            if (strategyCard) strategyCard.classList.add("hidden");
            getEl("empty-state", sff).classList.remove("hidden");
        }
    }

    // --- FINANCIAL CALCULATIONS ---
    function calcGroupFinancials(group, dr) {
        const {
            price, plantUnits, subUnits, prodCost,
            estimatedSales, employees, salaryPerEmployee,
            trainingBudget, shortTermDebt,
            maintenanceCostPerUnit, tax, costAdj, marketingAdj, marketingSpend,
            interest_st
        } = group;

        const effectiveSubUnits = Math.min(subUnits, 500);
        const subAlertFired = subUnits > 500;

        const trainingDiscountPercent = Math.floor(trainingBudget / 10000) * 0.01;
        
        const conf = getAdminConfig();
        const baseCost = conf.prod_cost_r1_t1 || 50;
        const finalCost = Math.max(prodCost || 50, baseCost);
        
        const efficientProdCost = finalCost * (1 - trainingDiscountPercent);
        const realProdCost = efficientProdCost * (1 + (costAdj / 100));

        const effPlant = Math.min(plantUnits || 0, 2000);
        const ptd = effPlant + effectiveSubUnits;
        const soldUnits = Math.min(dr, ptd);
        const estimationError = estimatedSales - dr;
        const unsoldUnits = Math.max(0, estimationError);

        const totalSales = soldUnits * price;
        const totalPropio = effPlant * realProdCost;
        const totalSub = effectiveSubUnits * (realProdCost * SUB_PENALTY);
        const totalSalaries = employees * salaryPerEmployee;
        const cogs = totalPropio + totalSub + totalSalaries;
        const grossProfit = totalSales - cogs;

        const gastosFinancierosST = shortTermDebt + (shortTermDebt * ((interest_st || 5) / 100));
        const maintenanceCost = unsoldUnits * (maintenanceCostPerUnit || 0);
        const gastosAP = marketingSpend;
        const tech2Expense = group.hasTech2 ? group.tech2Cost : 0;

        const ebitda = grossProfit - trainingBudget - maintenanceCost - gastosAP - tech2Expense - gastosFinancierosST;

        const ebit = ebitda - AMORTIZATION;

        const ebt = ebit;
        const taxAmount = ebt > 0 ? ebt * (tax / 100) : 0;
        const netProfit = ebt - taxAmount;
        const roi = (netProfit / INITIAL_INVESTMENT) * 100;

        return {
            soldUnits, unsoldUnits, estimationError, totalSales,
            totalPropio, totalSub, totalSalaries, trainingBudget,
            cogs, grossProfit, maintenanceCost, gastosFinancierosST,
            gastosAP, ebitda, ebit, ebt, taxAmount, netProfit, roi,
            realProdCost, subAlertFired, effectiveSubUnits, ptd, dr
        };
    }

    function calcGroupFinancials_R2(group, dr_t1, dr_t2) {
        const {
            priceT1, priceT2, estimatedSalesT1, estimatedSalesT2,
            plantT1, plantT2, subT1, subT2,
            employees, salaryPerEmployee,
            trainingBudget, shortTermDebt,
            maintenanceCostPerUnit, tax, costAdj, marketingAdj, marketingSpend,
            hasTech2, prodCostT1, prodCostT2, interest_st
        } = group;

        const trainingDiscountPercent = Math.floor(trainingBudget / 10000) * 0.01;

        // Use actual user-input quantities from the form (stored in group)
        const effPlantT1 = Math.min(plantT1 || 0, 2000);
        const effPlantT2 = hasTech2 ? Math.min(plantT2 || 0, 2000) : 0;
        const effSubT1   = Math.min(subT1 || 0, 500);
        const effSubT2   = hasTech2 ? Math.min(subT2 || 0, 500) : 0;

        const conf = getAdminConfig();
        const baseCostT1 = conf.prod_cost_r2_t1 || 50;
        const baseCostT2 = conf.prod_cost_r2_t2 || 60;

        const finalCostT1 = Math.max(prodCostT1 || 50, baseCostT1);
        const finalCostT2 = Math.max(prodCostT2 || 60, baseCostT2);

        const realProdCostT1 = finalCostT1 * (1 - trainingDiscountPercent) * (1 + (costAdj / 100));
        const realProdCostT2 = hasTech2 ? finalCostT2 * (1 - trainingDiscountPercent) * (1 + (costAdj / 100)) : 0;

        const subCostT1 = realProdCostT1 * SUB_PENALTY;
        const subCostT2 = hasTech2 ? realProdCostT2 * SUB_PENALTY : 0;

        const ptdT1 = effPlantT1 + effSubT1;
        const ptdT2 = effPlantT2 + effSubT2;
        const ptd = ptdT1 + ptdT2;

        const soldUnitsT1 = Math.min(dr_t1, ptdT1);
        const soldUnitsT2 = Math.min(dr_t2, ptdT2);
        const soldUnits = soldUnitsT1 + soldUnitsT2;

        const estimationError = ((estimatedSalesT1 || 0) + (estimatedSalesT2 || 0)) - (dr_t1 + dr_t2);
        const unsoldUnitsT1 = Math.max(0, (estimatedSalesT1 || 0) - dr_t1);
        const unsoldUnitsT2 = Math.max(0, (estimatedSalesT2 || 0) - dr_t2);
        const unsoldUnits = Math.max(0, estimationError);

        const totalSales = (soldUnitsT1 * (priceT1 || 0)) + (soldUnitsT2 * (priceT2 || 0));
        const totalPropio = (effPlantT1 * realProdCostT1) + (effPlantT2 * realProdCostT2);
        const totalSub = (effSubT1 * subCostT1) + (effSubT2 * subCostT2);
        const totalSalaries = employees * salaryPerEmployee;
        const cogs = totalPropio + totalSub + totalSalaries;
        const grossProfit = totalSales - cogs;

        const gastosFinancierosST = (shortTermDebt || 0) + ((shortTermDebt || 0) * ((interest_st || 5) / 100));
        const gastosAP = marketingSpend || 0;
        const maintenanceCost = unsoldUnits * (maintenanceCostPerUnit || 0);

        const ebitda = grossProfit - trainingBudget - maintenanceCost - gastosAP - gastosFinancierosST;

        const ebit = ebitda - AMORTIZATION;

        const ebt = ebit;
        const taxAmount = ebt > 0 ? ebt * (tax / 100) : 0;
        const netProfit = ebt - taxAmount;
        
        const capitalBase = INITIAL_INVESTMENT - AMORTIZATION;
        const roi = (netProfit / capitalBase) * 100;

        return {
            soldUnitsT1, soldUnitsT2, soldUnits, unsoldUnits, estimationError, totalSales,
            totalPropio, totalSub, totalSalaries, trainingBudget,
            cogs, grossProfit, maintenanceCost, gastosFinancierosST,
            gastosAP, ebitda, ebit, ebt, taxAmount, netProfit, roi,
            subAlertFired: false, ptd, dr: (dr_t1 + dr_t2),
            effSubT1, effSubT2
        };
    }

    // --- HTML UI UPDATERS ---
    function getEl(id, suffix) { return document.getElementById(id + suffix) || document.getElementById(id); }

    function updateResultsUI_R1(f, groupData, myDR, tech2FinancingGap, hasTech2, tech2Cost, sf, ivc = 0) {
        getEl("res-ventas", sf).innerText = formatCurr(f.totalSales);
        getEl("res-costo-propio", sf).innerText = formatCurr(f.totalPropio + f.totalSalaries + f.trainingBudget);
        getEl("row-costo-sub", sf).style.display = f.totalSub > 0 ? "" : "none";
        getEl("res-costo-sub", sf).innerText = formatCurr(f.totalSub);

        const resGross = getEl("res-gross", sf);
        resGross.innerText = formatCurr(f.grossProfit);
        resGross.style.color = f.grossProfit >= 0 ? "var(--accent)" : "var(--danger)";
        
        getEl("res-training", sf).innerText = formatCurr(f.trainingBudget);

        const rowTech2Acq = getEl("row-tech2-acq", sf);
        if (hasTech2) {
            rowTech2Acq.style.display = "";
            getEl("res-tech2-acq", sf).innerText = formatCurr(tech2Cost);
        } else {
            rowTech2Acq.style.display = "none";
        }

        getEl("row-maintenance", sf).style.display = f.maintenanceCost > 0 ? "" : "none";
        getEl("res-maintenance", sf).innerText = formatCurr(f.maintenanceCost);

        getEl("res-ap", sf).innerText = formatCurr(f.gastosAP);

        const resEbitda = getEl("res-ebitda", sf);
        resEbitda.innerText = formatCurr(f.ebitda);
        resEbitda.style.color = f.ebitda >= 0 ? "var(--accent)" : "var(--danger)";

        getEl("res-amortization", sf).innerText = formatCurr(AMORTIZATION);

        const resEbit = getEl("res-ebit", sf);
        resEbit.innerText = formatCurr(f.ebit);
        resEbit.style.color = f.ebit >= 0 ? "var(--accent)" : "var(--danger)";

        const resEbt = getEl("res-ebt", sf);
        resEbt.innerText = formatCurr(f.ebt);
        resEbt.style.color = f.ebt >= 0 ? "var(--accent)" : "var(--danger)";

        getEl("res-interest-st", sf).innerText = formatCurr(f.gastosFinancierosST);

        getEl("res-tax", sf).innerText = formatCurr(f.taxAmount);

        const resUtilidad = getEl("res-utilidad", sf);
        resUtilidad.innerText = formatCurr(f.netProfit);
        resUtilidad.style.color = f.netProfit >= 0 ? "var(--accent)" : "var(--danger)";

        const resRoi = getEl("res-roi", sf);
        resRoi.innerText = f.roi.toFixed(2) + "%";
        resRoi.style.color = f.roi >= 0 ? "var(--accent)" : "var(--danger)";

        getEl("kpi-demand", sf).innerText = myDR + " un.";
        getEl("kpi-sold", sf).innerText = f.soldUnits + " un.";
        getEl("kpi-stock", sf).innerText = f.unsoldUnits + " un.";

        const kpiErr = getEl("kpi-estimation-error", sf);
        kpiErr.innerText = (f.estimationError > 0 ? "+" : "") + f.estimationError + " un.";
        kpiErr.style.color = f.estimationError === 0 ? "var(--accent)" : "var(--danger)";
        
        const kpiIvc = getEl("kpi-ivc", sf);
        if(kpiIvc) kpiIvc.innerText = (ivc || 0).toFixed(3);
    }

    function updateResultsUI_R2(f, groupData, myDR, sf, f1 = null, ivc = 0) {
        getEl("res-ventas", sf).innerText = formatCurr(f.totalSales);
        getEl("res-costo-propio", sf).innerText = formatCurr(f.totalPropio + f.totalSalaries);
        getEl("row-costo-sub", sf).style.display = f.totalSub > 0 ? "" : "none";
        getEl("res-costo-sub", sf).innerText = formatCurr(f.totalSub);

        const grossProfit = f.grossProfit;
        const resGross = getEl("res-gross", sf);
        resGross.innerText = formatCurr(grossProfit);
        resGross.style.color = grossProfit >= 0 ? "var(--accent)" : "var(--danger)";

        getEl("res-training", sf).innerText = formatCurr(f.trainingBudget);

        const rowTech2Acq = getEl("row-tech2-acq", sf);
        if (rowTech2Acq) rowTech2Acq.style.display = "none";

        const maintenanceCost = f.maintenanceCost;
        getEl("row-maintenance", sf).style.display = maintenanceCost > 0 ? "" : "none";
        getEl("res-maintenance", sf).innerText = formatCurr(maintenanceCost);

        getEl("res-ap", sf).innerText = formatCurr(f.gastosAP);

        const ebitda = f.ebitda;
        const resEbitda = getEl("res-ebitda", sf);
        resEbitda.innerText = formatCurr(ebitda);
        resEbitda.style.color = ebitda >= 0 ? "var(--accent)" : "var(--danger)";

        getEl("res-amortization", sf).innerText = formatCurr(AMORTIZATION);

        const ebit = f.ebit;
        const resEbit = getEl("res-ebit", sf);
        resEbit.innerText = formatCurr(ebit);
        resEbit.style.color = ebit >= 0 ? "var(--accent)" : "var(--danger)";

        const ebt = f.ebt;
        const resEbt = getEl("res-ebt", sf);
        resEbt.innerText = formatCurr(ebt);
        resEbt.style.color = ebt >= 0 ? "var(--accent)" : "var(--danger)";

        getEl("res-interest-st", sf).innerText = formatCurr(f.gastosFinancierosST);

        getEl("res-tax", sf).innerText = formatCurr(f.taxAmount);

        const netProfit = f.netProfit;
        const resUtilidad = getEl("res-utilidad", sf);
        resUtilidad.innerText = formatCurr(netProfit);
        resUtilidad.style.color = netProfit >= 0 ? "var(--accent)" : "var(--danger)";

        const roi = f.roi;
        const resRoi = getEl("res-roi", sf);
        resRoi.innerText = roi.toFixed(2) + "%";
        resRoi.style.color = roi >= 0 ? "var(--accent)" : "var(--danger)";
        
        const capBase = getEl("res-cap-base", sf);
        if(capBase) capBase.innerText = "475k";

        const totalDR = myDR;
        getEl("kpi-demand", sf).innerText = totalDR + " un.";
        const totalSold = f.soldUnits;
        getEl("kpi-sold", sf).innerText = totalSold + " un.";
        const totalUnsold = f.unsoldUnits;
        getEl("kpi-stock", sf).innerText = totalUnsold + " un.";

        const totalErr = f.estimationError;
        const kpiErr = getEl("kpi-estimation-error", sf);
        kpiErr.innerText = (totalErr > 0 ? "+" : "") + totalErr + " un.";
        kpiErr.style.color = totalErr === 0 ? "var(--accent)" : "var(--danger)";
        
        const kpiIvc = getEl("kpi-ivc", sf);
        if(kpiIvc) kpiIvc.innerText = (ivc || 0).toFixed(3);
    }

    function updateInsights(f, groupData, myDR, totalGroups, mtd, sf) {
        const insightBox = getEl("insight-box", sf);
        if (!insightBox) return;
        let insightMsg = "";
        if (f.subAlertFired) insightMsg += `⚠️ <b>Alerta:</b> Tope de subcontratación de 300 aplicado automáticamente.<br><br>`;

        const marginRatio = groupData.price / (groupData.prodCostT1 || groupData.prodCost || 1);
        if (marginRatio < 1) insightMsg += "🚨 <b>Guerra de Precios:</b> Precio de venta menor a tu costo base.";
        else insightMsg += "✅ <b>Operación:</b> Tu precio cubre los costos base.";

        if (f.unsoldUnits > 0) insightMsg += `<br><br>📦 <b>Exceso de Inventario (${f.unsoldUnits} unid.):</b> Costos de mantenimiento generados.`;
        else if (f.soldUnits === f.ptd && myDR > f.ptd) insightMsg += `<br><br>🔥 <b>Quiebre de Stock (${myDR - f.ptd} unid.):</b> Demanda perdida por falta de producción.`;
        else if (f.unsoldUnits === 0 && myDR === f.ptd) insightMsg += `<br><br>🎯 <b>Equilibrio Perfecto:</b> Producción igual a demanda real.`;

        if (totalGroups > 1) {
            insightMsg += `<br><br>🏆 <b>Competencia:</b> Grupos activos: ${totalGroups}. MTD total: ${mtd}. Tu cuota: ${myDR} unid.`;
        }
        insightBox.innerHTML = insightMsg;
    }

    // --- MARKET ANALYSIS UI ---
    function updateMarketAnalysisUI(groupData, actualDR, round, dr_t1 = 0, dr_t2 = 0) {
        const sf = round === 1 ? "_r1" : "_r2";
        const tbody = getEl('market-analysis-body', sf);
        if (!tbody) return;

        // Get the right estimated sales and pricing
        const estimatedSales = round === 1
            ? (groupData.estimatedSales || 0)
            : ((groupData.estimatedSalesT1 || 0) + (groupData.estimatedSalesT2 || 0));

        const price    = round === 1 ? groupData.price    : (groupData.priceT1 || 0);
        const mkt      = round === 1 ? groupData.marketingSpend : (groupData.marketingSpend || 0);
        const training = groupData.trainingBudget || 0;
        const salary   = round === 1
            ? (groupData.employees || 0) * (groupData.salaryPerEmployee || 0)
            : (groupData.employees || 0) * (groupData.salaryPerEmployee || 0);

        const HR      = calcHR(training, salary);
        const hrPct   = ((HR - 1) * 100).toFixed(1);
        const hrLabel = HR >= 1.15 ? 'Alta inversión RRHH' : HR >= 1.05 ? 'Inversión moderada RRHH' : 'Baja inversión RRHH';

        const deviation    = actualDR - estimatedSales;
        const deviationStr = (deviation >= 0 ? '+' : '') + deviation + ' un.';

        let vrDetails = round === 1 ? 'Asignadas por el mercado' : `Asignadas: Tec 1 (${dr_t1} un.) | Tec 2 (${dr_t2} un.)`;

        let resultBadge;
        let resultMsg;
        if (deviation > 0) {
            resultBadge = '<span class="result-badge under">⚠️ Subestimación</span>';
            resultMsg   = 'Demanda insatisfecha. Podría haber vendido más.';
        } else if (deviation < 0) {
            resultBadge = '<span class="result-badge over">📦 Sobreestimación</span>';
            resultMsg   = 'Stock inmovilizado. Se produjo más de lo vendido.';
        } else {
            resultBadge = '<span class="result-badge success">🎯 Éxito</span>';
            resultMsg   = 'Estimación perfecta.';
        }

        const hrBadgeColor = HR >= 1.1 ? '#34d399' : HR >= 1.02 ? '#fbbf24' : '#94a3b8';

        tbody.innerHTML = `
            <tr>
                <td>Ventas Estimadas</td>
                <td>${estimatedSales} un.</td>
                <td style="color:var(--text-muted)">Proyección del equipo</td>
                <td>—</td>
            </tr>
            <tr>
                <td>Ventas Reales (VR)</td>
                <td style="font-weight:700;color:var(--accent)">${actualDR} un.</td>
                <td style="color:var(--text-muted)">${vrDetails}</td>
                <td>${resultBadge}</td>
            </tr>
            <tr>
                <td>Desvío</td>
                <td style="font-weight:700;color:${deviation >= 0 ? 'var(--warning)' : 'var(--danger)'}">${deviationStr}</td>
                <td style="color:var(--text-muted)">${resultMsg}</td>
                <td>—</td>
            </tr>
            <tr>
                <td>Multiplicador RRHH (HR)</td>
                <td style="font-weight:700;color:${hrBadgeColor}">×${HR.toFixed(3)} <small style="color:var(--text-muted)">+${hrPct}%</small></td>
                <td style="color:var(--text-muted)">${hrLabel}</td>
                <td>—</td>
            </tr>
        `;
    }

    function showError(msg) {
        errorBox.innerText = msg;
        errorBox.classList.remove("hidden");
    }

    // --- STUDENT CHARTS ---
    function renderStudentCharts(f, suffix = "") {
        const ctxBreakdown = document.getElementById('studentChartBreakdown' + suffix);
        const ctxProfitability = document.getElementById('studentChartProfitability' + suffix);
        if (!ctxBreakdown || !ctxProfitability) return;

        if (studentCharts.breakdown[suffix]) studentCharts.breakdown[suffix].destroy();
        studentCharts.breakdown[suffix] = new Chart(ctxBreakdown, {
            type: 'pie',
            data: {
                labels: ['Costo Prod.', 'Costo Subcont.', 'A&P', 'Mant.', 'Intereses ST', 'Tax', 'Amort.'],
                datasets: [{
                    data: [
                        f.totalPropio + f.totalSalaries, 
                        f.totalSub, 
                        f.gastosAP, 
                        f.maintenanceCost, 
                        f.gastosFinancierosST, 
                        f.taxAmount, 
                        AMORTIZATION
                    ],
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#0ea5e9', '#f59e0b', '#ef4444', '#64748b', '#94a3b8']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Distribución de Ingresos y Egresos' } } }
        });

        if (studentCharts.profitability[suffix]) studentCharts.profitability[suffix].destroy();
        studentCharts.profitability[suffix] = new Chart(ctxProfitability, {
            type: 'bar',
            data: {
                labels: ['Ventas', 'Egresos Totales', 'Utilidad Neta'],
                datasets: [{
                    label: 'Monto',
                    data: [f.totalSales, f.cogs + f.maintenanceCost + f.gastosAP + f.gastosFinancierosST + f.taxAmount + AMORTIZATION, f.netProfit],
                    backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)', f.netProfit >= 0 ? 'rgba(5, 150, 105, 0.8)' : 'rgba(220, 38, 38, 0.8)'],
                    borderColor: ['#10b981', '#ef4444', f.netProfit >= 0 ? '#059669' : '#dc2626'],
                    borderWidth: 2,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    title: { display: true, text: 'Resumen de Rentabilidad', font: { size: 14, weight: 'bold' }, color: '#94a3b8' }, 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#e2e8f0', font: { weight: '600' } }
                    }
                }
            }
        });
    }

    function calculateIVC(f1, f2, mtd_total, dr_total, sub_maxed) {
        const netProfit = (f1 ? f1.netProfit : 0) + (f2 ? f2.netProfit : 0);
        
        let totalCostos = 0;
        if (f1) totalCostos += f1.cogs + f1.gastosAP;
        if (f2) totalCostos += f2.cogs + f2.gastosAP;
        
        const cuota = dr_total / (mtd_total || 1);
        
        if (totalCostos === 0) return 0;
        
        let ivc = (netProfit * (1 + cuota)) / totalCostos;
        
        if (sub_maxed) {
            ivc *= 0.9;
        }
        return ivc;
    }

    function checkAndShowTrophy(g1, g2, conf) {
        const trophyContainer = document.getElementById("winner-trophy-container");
        if (!trophyContainer) return;
        
        trophyContainer.classList.remove("hidden");
        
        if (g2.length < conf.cant_grupos) {
            trophyContainer.innerHTML = "";
            return;
        }
        
        const mtd_total = conf.mtd + (conf.mtd_r2 || 7500);
        const allDemands1 = calcAllDemands(g1, conf.mtd);
        const allDemands2 = calcAllDemandsR2(g2, conf.mtd_r2 || 7500);

        let bestGroup = null;
        let bestIVC = -Infinity;

        g2.forEach(group => {
            const group1 = g1.find(g => g.name === group.name);
            const dr1 = allDemands1.find(d => d.name === group.name)?.dr || 0;
            const dr2_t1 = allDemands2.find(d => d.name === group.name)?.dr_t1 || 0;
            const dr2_t2 = allDemands2.find(d => d.name === group.name)?.dr_t2 || 0;
            const dr_total = dr1 + dr2_t1 + dr2_t2;
            
            const f1 = group1 ? calcGroupFinancials(group1, dr1) : null;
            const f2 = calcGroupFinancials_R2(group, dr2_t1, dr2_t2);
            
            const sub_maxed = (f2.effSubT1 >= 500) || (f2.effSubT2 >= 500);
            
            const ivc = calculateIVC(f1, f2, mtd_total, dr_total, sub_maxed);
            
            if (ivc > bestIVC) {
                bestIVC = ivc;
                bestGroup = group.name;
            }
        });

        if (bestGroup === currentUserGroup) {
            if (typeof confetti === "function") {
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            }
            trophyContainer.innerHTML = `
                <div style="background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 2.5rem; border-radius: 1rem; color: #fff; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.4); border: 2px solid #fcd34d; margin-top: 1rem;">
                    <div style="font-size: 4.5rem; margin-bottom: 0.5rem; text-shadow: 0 4px 6px rgba(0,0,0,0.2);">🏆</div>
                    <h2 style="color: #fff; margin-bottom: 0.5rem; font-size: 2.2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">¡Felicidades, Equipo Ganador!</h2>
                    <p style="font-size: 1.15rem; opacity: 0.95; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Su gestión integral ha maximizado el Valor para el Accionista (IVC: ${bestIVC.toFixed(3)}).</p>
                </div>
            `;
        } else {
            trophyContainer.innerHTML = `
                <div style="padding: 1rem; background: var(--surface-light); border-radius: 8px; border: 1px solid var(--border);">
                    <p style="margin: 0; color: var(--text-muted);">Simulación finalizada. El equipo ganador fue <strong>${bestGroup}</strong>.</p>
                </div>
            `;
        }
    }

    function loadBothResults() {
        if (!currentUserGroup) return;
        const conf = getAdminConfig();
        const g1 = getGroupsData(1);
        const g2 = getGroupsData(2);
        const myData1 = g1.find(g => g.name === currentUserGroup);
        const myData2 = g2.find(g => g.name === currentUserGroup);

        const r1Panel = document.getElementById("results-panel_r1");
        const r2Panel = document.getElementById("results-panel_r2");

        if (r1Panel) {
            if (myData1) {
                r1Panel.classList.remove("hidden");
                const allDemands1 = calcAllDemands(g1, conf.mtd);
                const myDR1 = allDemands1.find(d => d.name === currentUserGroup)?.dr || 0;
                const f1 = calcGroupFinancials(myData1, myDR1);
                
                const myIVC = calculateIVC(f1, null, conf.mtd, myDR1, f1.effectiveSubUnits > 500);
                updateResultsUI_R1(f1, myData1, myDR1, myData1.tech2FinancingGap, myData1.hasTech2, myData1.tech2Cost, "_r1", myIVC);
            } else {
                r1Panel.classList.add("hidden");
            }
        }

        if (r2Panel) {
            if (myData2) {
                r2Panel.classList.remove("hidden");
                const allDemands2 = calcAllDemandsR2(g2, conf.mtd_r2 || 7500);
                const myDR2 = allDemands2.find(d => d.name === currentUserGroup) || {dr_t1:0, dr_t2:0};
                const f2 = calcGroupFinancials_R2(myData2, myDR2.dr_t1, myDR2.dr_t2);
                let f1 = null;
                let myIVC = 0;
                if (myData1) {
                    const allDemands1 = calcAllDemands(g1, conf.mtd);
                    const myDR1 = allDemands1.find(d => d.name === currentUserGroup)?.dr || 0;
                    f1 = calcGroupFinancials(myData1, myDR1);
                    const mtd_total = conf.mtd + (conf.mtd_r2 || 7500);
                    const dr_total = myDR1 + myDR2.dr_t1 + myDR2.dr_t2;
                    const sub_maxed = (f2.effectiveSubUnits >= 300) || ((myData2.subUnitsT1 || 0) + (myData2.subUnitsT2 || 0) >= 300);
                    myIVC = calculateIVC(f1, f2, mtd_total, dr_total, sub_maxed);
                }
                updateResultsUI_R2(f2, myData2, myDR2.dr_t1 + myDR2.dr_t2, "_r2", f1, myIVC);
            } else {
                r2Panel.classList.add("hidden");
            }
        }

        checkAndShowTrophy(g1, g2, conf);
        
        const emptyState = document.getElementById("empty-state");
        if (emptyState && (myData1 || myData2)) emptyState.classList.add("hidden");
    }

    // --- CHART GLOBALS ---
    function updateChartsGlobal() {
        const conf = getAdminConfig();
        const mtd = conf.mtd;

        const g2 = getGroupsData(2);
        const g1 = getGroupsData(1);
        const isR2 = g2.length > 0;
        const targetGroups = isR2 ? g2 : g1;

        if (targetGroups.length === 0) return;

        const allDemands = isR2
            ? calcAllDemandsR2(targetGroups, conf.mtd_r2 || 7500)
            : calcAllDemands(targetGroups, mtd);

        const mtd_total = conf.mtd + (isR2 ? (conf.mtd_r2 || 7500) : 0);
        const allDemands1 = calcAllDemands(g1, conf.mtd);

        const allFinancials = targetGroups.map(group => {
            let units = 0, profit = 0, roi = 0, ivc = 0;
            const group1 = g1.find(g => g.name === group.name);
            const dr1 = allDemands1.find(d => d.name === group.name)?.dr || 0;
            const f1 = group1 ? calcGroupFinancials(group1, dr1) : null;
            
            if (isR2) {
                const demandEntry = allDemands.find(d => d.name === group.name);
                const dr_t1 = demandEntry ? demandEntry.dr_t1 : 0;
                const dr_t2 = demandEntry ? demandEntry.dr_t2 : 0;
                const f2 = calcGroupFinancials_R2(group, dr_t1, dr_t2);
                
                units = (f1?.soldUnits || 0) + f2.soldUnits;
                profit = (f1?.netProfit || 0) + f2.netProfit;
                roi = (profit / INITIAL_INVESTMENT) * 100;
                const dr_total = dr1 + dr_t1 + dr_t2;
                const sub_maxed = (f2.effectiveSubUnits >= 300) || (group.subT1 + group.subT2 >= 300);
                ivc = calculateIVC(f1, f2, mtd_total, dr_total, sub_maxed);
            } else {
                const f = f1;
                if(f) {
                    units = f.soldUnits;
                    profit = f.netProfit;
                    roi = f.roi;
                    const sub_maxed2 = f.effectiveSubUnits > 500;
                    ivc = calculateIVC(f, null, mtd_total, dr1, sub_maxed2);
                }
            }
            return { name: group.name, units, profit, roi, ivc };
        });

        allFinancials.sort((a, b) => b.profit - a.profit);
        const labels = allFinancials.map(g => g.name);
        const pieLabels = allFinancials.map(g => `${g.name} (${g.units} unid.)`);
        const dataUnits = allFinancials.map(g => g.units);
        const dataProfit = allFinancials.map(g => g.profit);
        const dataROI = allFinancials.map(g => g.roi);

        Chart.defaults.color = '#64748b';
        Chart.defaults.font.family = "'Inter', sans-serif";

        // --- TABLE: Real Sales vs Estimated ---
        const tableBody = document.getElementById('admin-ventas-table-body');
        if (tableBody) {
            let html = '';
            const allGroups = [...new Set([...g1.map(g => g.name), ...g2.map(g => g.name)])];
            
            allGroups.forEach(gName => {
                const gr1 = g1.find(g => g.name === gName) || {};
                const gr2 = g2.find(g => g.name === gName) || {};
                
                // R1 data
                const est1 = gr1.estimatedSales || 0;
                const d1 = allDemands1.find(d => d.name === gName);
                const f1 = gr1.name ? calcGroupFinancials(gr1, d1 ? d1.dr : 0) : null;
                const real1 = f1 ? f1.soldUnits : 0;
                const dev1 = real1 - est1;
                const dev1Str = (dev1 > 0 ? '+' : '') + dev1;
                const c1 = dev1 > 0 ? 'var(--warning)' : (dev1 < 0 ? 'var(--danger)' : 'var(--accent)');
                
                // R2 data
                const est2 = (gr2.estimatedSalesT1 || 0) + (gr2.estimatedSalesT2 || 0);
                const d2 = isR2 ? allDemands.find(d => d.name === gName) : null;
                const f2 = gr2.name && d2 ? calcGroupFinancials_R2(gr2, d2.dr_t1, d2.dr_t2) : null;
                const real2_t1 = f2 ? f2.soldUnitsT1 : 0;
                const real2_t2 = f2 ? f2.soldUnitsT2 : 0;
                const real2 = real2_t1 + real2_t2;
                const dev2 = real2 - est2;
                const dev2Str = (dev2 > 0 ? '+' : '') + dev2;
                const c2 = dev2 > 0 ? 'var(--warning)' : (dev2 < 0 ? 'var(--danger)' : 'var(--accent)');
                
                // Total
                const estTotal = est1 + est2;
                const realTotal = real1 + real2;
                const devTotal = realTotal - estTotal;
                const devTotalStr = (devTotal > 0 ? '+' : '') + devTotal;
                const cTotal = devTotal > 0 ? 'var(--warning)' : (devTotal < 0 ? 'var(--danger)' : 'var(--accent)');

                html += `<tr>
                    <td style="font-weight:600">${gName}</td>
                    <td>${est1 > 0 ? est1 : '-'}</td>
                    <td style="color:var(--accent); font-weight:600">${real1 > 0 ? real1 : '-'}</td>
                    <td style="color:${c1}">${est1 > 0 ? dev1Str : '-'}</td>
                    <td>${est2 > 0 ? est2 : '-'}</td>
                    <td style="color:var(--accent); font-weight:600">${real2_t1 > 0 ? real2_t1 : '-'}</td>
                    <td style="color:var(--accent); font-weight:600">${real2_t2 > 0 ? real2_t2 : '-'}</td>
                    <td style="color:${c2}">${est2 > 0 ? dev2Str : '-'}</td>
                    <td style="font-weight:600">${estTotal > 0 ? estTotal : '-'}</td>
                    <td style="color:var(--accent); font-weight:700">${realTotal > 0 ? realTotal : '-'}</td>
                    <td style="color:${cTotal}; font-weight:700">${estTotal > 0 ? devTotalStr : '-'}</td>
                </tr>`;
            });
            tableBody.innerHTML = html;
        }

        // --- BAR CHART: Net Profit ---
        const profitBGs = dataProfit.map(val => val >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)');
        const profitBorders = dataProfit.map(val => val >= 0 ? '#10b981' : '#ef4444');

        if (rankingChartProfit) {
            rankingChartProfit.data.labels = labels;
            rankingChartProfit.data.datasets[0].data = dataProfit;
            rankingChartProfit.data.datasets[0].backgroundColor = profitBGs;
            rankingChartProfit.data.datasets[0].borderColor = profitBorders;
            rankingChartProfit.update();
        } else {
            const ctxP = document.getElementById('rankingChartProfit').getContext('2d');
            rankingChartProfit = new Chart(ctxP, {
                type: 'bar',
                data: {
                    labels, datasets: [{
                        label: 'Utilidad Neta ($)', data: dataProfit,
                        backgroundColor: profitBGs, borderColor: profitBorders, borderWidth: 1, borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true }, y: { grid: { display: false } } }
                }
            });
        }

        // --- BAR CHART: ROI ---
        const roiBGs = dataROI.map(val => val >= 0 ? 'rgba(99,102,241,0.6)' : 'rgba(239,68,68,0.6)');
        const roiBorders = dataROI.map(val => val >= 0 ? '#6366f1' : '#ef4444');

        if (rankingChartROI) {
            rankingChartROI.data.labels = labels;
            rankingChartROI.data.datasets[0].data = dataROI;
            rankingChartROI.data.datasets[0].backgroundColor = roiBGs;
            rankingChartROI.data.datasets[0].borderColor = roiBorders;
            rankingChartROI.update();
        } else {
            const ctxR = document.getElementById('rankingChartROI');
            if (ctxR) {
                rankingChartROI = new Chart(ctxR.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels, datasets: [{
                            label: 'ROI (%)', data: dataROI.map(v => parseFloat(v.toFixed(2))),
                            backgroundColor: roiBGs, borderColor: roiBorders, borderWidth: 1, borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: false, ticks: { callback: v => v.toFixed(1) + '%' } },
                            y: { grid: { display: false } }
                        }
                    }
                });
            }
        }

        // --- TABLE: IVC Ranking ---
        const ivcTableBody = document.getElementById('admin-ivc-table-body');
        if (ivcTableBody) {
            let ivcHtml = '';
            const ivcList = [...allFinancials].sort((a,b) => b.ivc - a.ivc);
            ivcList.forEach(g => {
                let note = '';
                let color = '';
                if (g.ivc > 1.2) { note = 'Excelente'; color = 'var(--accent)'; }
                else if (g.ivc >= 0.8) { note = 'Estable'; color = 'var(--warning)'; }
                else { note = 'Riesgo / Precaución'; color = 'var(--danger)'; }
                ivcHtml += `<tr>
                    <td style="font-weight:600">${g.name}</td>
                    <td style="font-weight:700; color:${color}">${g.ivc.toFixed(3)}</td>
                    <td style="color:${color}">${note}</td>
                </tr>`;
            });
            ivcTableBody.innerHTML = ivcHtml;
        }
    }
});
