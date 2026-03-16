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
    const btnLogoutStudent = document.getElementById("btn-logout-student");
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
    const resultsData = document.getElementById("results-data");
    const emptyState = document.getElementById("empty-state");
    const form = document.getElementById("sim-form");
    const errorBox = document.getElementById("error-message");
    const priceInput = document.getElementById("price");

    // Chart elements
    let rankingChartUnits = null;
    let rankingChartProfit = null;

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

    // --- LOCAL STORAGE UTILS ---
    function getAdminConfig() {
        return JSON.parse(localStorage.getItem('adminConfig')) || {
            mtd: 5000, cost_adj: 0, marketing_adj: 0, tax: 30,
            prod_cost: 50, prod_cost_t2: 60, tech2_cost: 30000,
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

    btnLogoutStudent.addEventListener("click", () => { showScreen("login"); });
    btnLogoutAdmin.addEventListener("click", () => { showScreen("login"); });

    function showScreen(screen) {
        loginScreen.classList.remove("active");
        adminScreen.classList.remove("active");
        studentScreen.classList.remove("active");
        btnLogoutStudent.classList.add("hidden");

        if (screen === "login") {
            loginScreen.classList.add("active");
        } else if (screen === "admin") {
            adminScreen.classList.add("active");
        } else if (screen === "student") {
            studentScreen.classList.add("active");
            btnLogoutStudent.classList.remove("hidden");
        }
    }

    // --- ADMIN LOGIC ---
    function loadAdminForm() {
        const conf = getAdminConfig();
        document.getElementById("admin_user").value = conf.admin_user || 'admin';
        document.getElementById("admin_pass").value = conf.admin_pass || 'admin123';
        document.getElementById("admin_mtd").value = conf.mtd;
        document.getElementById("admin_cost_adj").value = conf.cost_adj;
        document.getElementById("admin_marketing_adj").value = conf.marketing_adj;
        document.getElementById("admin_tax").value = conf.tax;
        document.getElementById("admin_prod_cost").value = conf.prod_cost;
        document.getElementById("admin_prod_cost_t2").value = conf.prod_cost_t2;
        document.getElementById("admin_tech2_cost").value = conf.tech2_cost;
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

    adminForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveAdminConfig({
            admin_user: document.getElementById("admin_user").value.trim(),
            admin_pass: document.getElementById("admin_pass").value,
            mtd: parseFloat(document.getElementById("admin_mtd").value) || 5000,
            cost_adj: parseFloat(document.getElementById("admin_cost_adj").value) || 0,
            marketing_adj: parseFloat(document.getElementById("admin_marketing_adj").value) || 0,
            tax: parseFloat(document.getElementById("admin_tax").value) || 30,
            prod_cost: parseFloat(document.getElementById("admin_prod_cost").value) || 50,
            prod_cost_t2: parseFloat(document.getElementById("admin_prod_cost_t2").value) || 60,
            tech2_cost: parseFloat(document.getElementById("admin_tech2_cost").value) || 30000
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
        mtdInput.value = conf.mtd;
        costAdjInput.value = conf.cost_adj;
        marketingAdjInput.value = conf.marketing_adj;
        taxInput.value = conf.tax;
        tech2CostInput.value = conf.tech2_cost;

        updateTech2Badge();
        if (currentRound === 2) adaptRound2Ops();

        tryToShowPreviousResults();
    }

    window.switchRound = function (round) {
        currentRound = round;
        document.getElementById("tab-r1").classList.toggle("active", round === 1);
        document.getElementById("tab-r2").classList.toggle("active", round === 2);
        document.getElementById("ops-r1").classList.toggle("hidden", round !== 1);
        document.getElementById("ops-r2").classList.toggle("hidden", round !== 2);
        document.getElementById("results-round-badge").textContent = `Ronda ${round}`;

        if (round === 2) adaptRound2Ops();

        // Hide results until form is submitted for this round, or try to load existing
        errorBox.classList.add("hidden");
        tryToShowPreviousResults();
    };

    function adaptRound2Ops() {
        const r1Group = getGroupsData(1).find(g => g.name === currentUserGroup);
        const hasTech2 = r1Group ? r1Group.hasTech2 : false;
        document.getElementById("ops-r2-no-tech2").classList.toggle("hidden", hasTech2);
        document.getElementById("ops-r2-with-tech2").classList.toggle("hidden", !hasTech2);
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
        hint.style.display = buyTech2Checkbox.checked ? "block" : "none";
    });

    const priceHint = document.createElement('small');
    priceHint.className = 'hint suggestion-hint';
    priceHint.style.color = '#0f172a';
    priceInput.parentNode.insertBefore(priceHint, priceInput.nextSibling);

    priceInput.addEventListener('focus', () => {
        const conf = getAdminConfig();
        const cost = conf.prod_cost;
        if (cost > 0) {
            const minSugg = (cost * 1.5).toFixed(2);
            const maxSugg = (cost * 2.5).toFixed(2);
            priceHint.innerText = `💡 Sugerencia competitiva: $${minSugg} - $${maxSugg}`;
        }
    });

    // Subcontratación Limit Enforcement
    const subUnitsInput = document.getElementById("sub_units");
    subUnitsInput.addEventListener("input", (e) => {
        if (parseInt(e.target.value) > 300) {
            e.target.value = 300;
        }
    });

    // Form Submission
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorBox.classList.add("hidden");
        errorBox.innerText = "";

        if (currentRound === 1) {
            processRound1();
        } else {
            processRound2();
        }
    });

    // --- FORMULAS ---
    function calcIA(price, marketingSpend) {
        return (WM * marketingSpend) + (WP * (1 / price * 1000));
    }

    function calcAllDemands(sourceResults, mtd) {
        const totalIA = sourceResults.reduce((sum, g) => sum + g.ia, 0);
        if (totalIA === 0) return sourceResults.map(g => ({ name: g.name, dr: 0 }));
        return sourceResults.map(g => ({
            name: g.name,
            dr: Math.floor(mtd * (g.ia / totalIA))
        }));
    }

    // --- ROUND 1 PROCESS ---
    function processRound1() {
        const conf = getAdminConfig();
        const mtd = conf.mtd;

        const price = parseFloat(document.getElementById("price").value);
        const estimatedSales = parseInt(document.getElementById("estimated_sales").value);
        const marketingSpend = parseFloat(document.getElementById("marketing_spend").value);
        const plantUnits = parseInt(document.getElementById("plant_units").value);
        const subUnits = parseInt(document.getElementById("sub_units").value);
        const inputProdCost = parseFloat(document.getElementById("prod_cost").value);

        const employees = parseInt(document.getElementById("employees").value);
        const salaryPerEmployee = parseFloat(document.getElementById("salary_per_employee").value);
        const trainingBudget = parseFloat(document.getElementById("training_budget").value);
        const shortTermDebt = parseFloat(document.getElementById("short_term_debt").value);
        const longTermDebt = parseFloat(document.getElementById("long_term_debt").value);
        const maintenanceCostPerUnit = parseFloat(document.getElementById("maintenance_cost").value);

        const buyTech2 = document.getElementById("buy_tech2").checked;

        if (plantUnits > 2000) { showError("❌ La capacidad máxima de la planta es 2000 unidades."); return; }
        if (subUnits > 300) { showError("❌ El máximo a subcontratar son 300 unidades."); return; }
        if (price <= 0) { showError("❌ El precio de venta no puede ser cero o negativo."); return; }

        const ia = calcIA(price, marketingSpend);

        const groupData = {
            name: currentUserGroup, price, marketingSpend, ia,
            plantUnits, subUnits, prodCost: inputProdCost, estimatedSales,
            employees, salaryPerEmployee, trainingBudget,
            shortTermDebt, baseShortTermDebt: shortTermDebt, longTermDebt, maintenanceCostPerUnit,
            tax: conf.tax, costAdj: conf.cost_adj, marketingAdj: conf.marketing_adj, mtd,
            buyTech2, tech2Cost: conf.tech2_cost, tech2FinancingGap: 0, hasTech2: false
        };

        const groupsData = getGroupsData(1);
        const existingIdx = groupsData.findIndex(g => g.name === currentUserGroup);

        // Temp eval for Tech2
        const tempResults = [...groupsData];
        if (existingIdx !== -1) tempResults[existingIdx] = groupData;
        else tempResults.push(groupData);

        const tempDemands = calcAllDemands(tempResults, mtd);
        const tempDR = tempDemands.find(d => d.name === currentUserGroup).dr;
        const tempF = calcGroupFinancials(groupData, tempDR);

        if (buyTech2) {
            if (tempF.netProfit <= 0) {
                showError(`❌ No puedes comprar la Tecnología 2. Tu Utilidad Neta proyectada es ${formatCurr(tempF.netProfit)}, necesitas que sea positiva.`);
                return;
            }
            groupData.tech2FinancingGap = Math.max(0, conf.tech2_cost - tempF.netProfit);
            groupData.hasTech2 = true;
            groupData.shortTermDebt += groupData.tech2FinancingGap;
        }

        if (existingIdx !== -1) groupsData[existingIdx] = groupData;
        else groupsData.push(groupData);

        saveGroupsData(groupsData, 1);
        tryToShowPreviousResults();
        alert("💾 Decisión de la Ronda 1 guardada con éxito.");
    }

    // --- ROUND 2 PROCESS ---
    function processRound2() {
        const conf = getAdminConfig();
        const mtd = conf.mtd;

        const r1Data = getGroupsData(1).find(g => g.name === currentUserGroup);
        if (!r1Data) {
            showError("❌ Debes completar y guardar la Ronda 1 primero.");
            return;
        }

        const price = parseFloat(document.getElementById("price").value);
        const estimatedSales = parseInt(document.getElementById("estimated_sales").value);
        const marketingSpend = parseFloat(document.getElementById("marketing_spend").value);

        const employees = parseInt(document.getElementById("employees").value);
        const salaryPerEmployee = parseFloat(document.getElementById("salary_per_employee").value);
        const trainingBudget = parseFloat(document.getElementById("training_budget").value);
        const shortTermDebt = parseFloat(document.getElementById("short_term_debt").value);
        const longTermDebt = parseFloat(document.getElementById("long_term_debt").value);
        const maintenanceCostPerUnit = parseFloat(document.getElementById("maintenance_cost").value);

        let inputProdCostT1, inputProdCostT2 = 0;
        if (r1Data.hasTech2) {
            inputProdCostT1 = parseFloat(document.getElementById("r2_prod_cost_t1_tech").value);
            inputProdCostT2 = parseFloat(document.getElementById("r2_prod_cost_t2").value);
        } else {
            inputProdCostT1 = parseFloat(document.getElementById("r2_prod_cost_t1").value);
        }

        if (price <= 0) { showError("❌ El precio de venta no puede ser cero o negativo."); return; }

        const ia = calcIA(price, marketingSpend);
        const groupData = {
            name: currentUserGroup, price, marketingSpend, ia, estimatedSales,
            employees, salaryPerEmployee, trainingBudget,
            shortTermDebt, longTermDebt, maintenanceCostPerUnit,
            tax: conf.tax, costAdj: conf.cost_adj, marketingAdj: conf.marketing_adj, mtd,
            hasTech2: r1Data.hasTech2,
            prodCostT1: inputProdCostT1, prodCostT2: inputProdCostT2
        };

        const groupsDataR2 = getGroupsData(2);
        const existingIdx = groupsDataR2.findIndex(g => g.name === currentUserGroup);

        if (existingIdx !== -1) groupsDataR2[existingIdx] = groupData;
        else groupsDataR2.push(groupData);

        saveGroupsData(groupsDataR2, 2);
        tryToShowPreviousResults();
        alert("💾 Decisión de la Ronda 2 guardada con éxito.");
    }

    function tryToShowPreviousResults() {
        if (!currentUserGroup) return;
        const groupsData = getGroupsData(currentRound);
        const myData = groupsData.find(g => g.name === currentUserGroup);

        if (myData) {
            const conf = getAdminConfig();
            const allDemands = calcAllDemands(groupsData, conf.mtd);
            const myDR = allDemands.find(d => d.name === currentUserGroup).dr;

            let f;
            if (currentRound === 1) {
                f = calcGroupFinancials(myData, myDR);
                updateResultsUI_R1(f, myData, myDR, myData.tech2FinancingGap, myData.hasTech2, myData.tech2Cost);
            } else {
                f = calcGroupFinancials_R2(myData, myDR);
                updateResultsUI_R2(f, myData, myDR);
            }
            updateInsights(f, myData, myDR, groupsData.length, conf.mtd);
            emptyState.classList.add("hidden");
            resultsData.classList.remove("hidden");
        } else {
            resultsData.classList.add("hidden");
            emptyState.classList.remove("hidden");
        }
    }

    // --- FINANCIAL CALCULATIONS ---
    function calcGroupFinancials(group, dr) {
        const {
            price, plantUnits, subUnits, prodCost,
            estimatedSales, employees, salaryPerEmployee,
            trainingBudget, shortTermDebt, longTermDebt,
            maintenanceCostPerUnit, tax, costAdj, marketingAdj, marketingSpend
        } = group;

        const effectiveSubUnits = Math.min(subUnits, SUB_CAP);
        const subAlertFired = subUnits > SUB_CAP;

        const trainingDiscountPercent = Math.floor(trainingBudget / 10000) * 0.01;
        const efficientProdCost = prodCost * (1 - trainingDiscountPercent);
        const realProdCost = efficientProdCost * (1 + (costAdj / 100));

        const ptd = plantUnits + effectiveSubUnits;

        let projectedSoldUnits = Math.floor(dr + (dr * (marketingAdj / 100)));
        const soldUnits = Math.min(projectedSoldUnits, ptd);
        const unsoldUnits = ptd - soldUnits;
        const estimationError = estimatedSales - dr;

        const totalSales = soldUnits * price;
        const totalPropio = plantUnits * realProdCost;
        const totalSub = effectiveSubUnits * (realProdCost * SUB_PENALTY);
        const totalSalaries = employees * salaryPerEmployee;
        const cogs = totalPropio + totalSub + totalSalaries + trainingBudget;
        const grossProfit = totalSales - cogs;

        const maintenanceCost = unsoldUnits * maintenanceCostPerUnit;
        const gastosFinancieros = shortTermDebt;
        const gastosAP = marketingSpend;
        const ebitda = grossProfit - maintenanceCost - gastosFinancieros - gastosAP;

        const ebit = ebitda - AMORTIZATION;
        const ebt = ebit - longTermDebt;
        const taxAmount = ebt > 0 ? ebt * (tax / 100) : 0;
        const netProfit = ebt - taxAmount;
        const roi = (netProfit / INITIAL_INVESTMENT) * 100;

        return {
            soldUnits, unsoldUnits, estimationError, totalSales,
            totalPropio, totalSub, totalSalaries, trainingBudget,
            cogs, grossProfit, maintenanceCost, gastosFinancieros,
            gastosAP, ebitda, ebit, ebt, taxAmount, netProfit, roi,
            realProdCost, subAlertFired, effectiveSubUnits, ptd, dr,
            projectedSoldUnits
        };
    }

    function calcGroupFinancials_R2(group, dr) {
        const {
            price, estimatedSales, employees, salaryPerEmployee,
            trainingBudget, shortTermDebt, longTermDebt,
            maintenanceCostPerUnit, tax, costAdj, marketingAdj, marketingSpend,
            hasTech2, prodCostT1, prodCostT2
        } = group;

        const trainingDiscountPercent = Math.floor(trainingBudget / 10000) * 0.01;

        let plantT1, plantT2, subT1, subT2;
        let subCostT1, subCostT2;

        if (hasTech2) {
            plantT1 = 1500; plantT2 = 1000;
            subT1 = 500; subT2 = 300;
            subCostT1 = prodCostT1 * 1.15;
            subCostT2 = prodCostT2 * 1.20;
        } else {
            plantT1 = 3000; plantT2 = 0;
            subT1 = 500; subT2 = 0;
            subCostT1 = prodCostT1 * 1.05;
            subCostT2 = 0;
        }

        const realProdCostT1 = prodCostT1 * (1 - trainingDiscountPercent) * (1 + (costAdj / 100));
        const realProdCostT2 = hasTech2 ? prodCostT2 * (1 - trainingDiscountPercent) * (1 + (costAdj / 100)) : 0;

        const ptd = plantT1 + subT1 + plantT2 + subT2;
        let projectedSoldUnits = Math.floor(dr + (dr * (marketingAdj / 100)));
        const soldUnits = Math.min(projectedSoldUnits, ptd);
        const unsoldUnits = ptd - soldUnits;
        const estimationError = estimatedSales - dr;

        const totalSales = soldUnits * price;
        const totalPropio = (plantT1 * realProdCostT1) + (plantT2 * realProdCostT2);
        const totalSub = (subT1 * subCostT1) + (subT2 * subCostT2);
        const totalSalaries = employees * salaryPerEmployee;
        const cogs = totalPropio + totalSub + totalSalaries + trainingBudget;
        const grossProfit = totalSales - cogs;

        const maintenanceCost = unsoldUnits * maintenanceCostPerUnit;
        const ebitda = grossProfit - maintenanceCost - shortTermDebt - marketingSpend;

        const ebit = ebitda - AMORTIZATION;
        const ebt = ebit - longTermDebt;
        const taxAmount = ebt > 0 ? ebt * (tax / 100) : 0;
        const netProfit = ebt - taxAmount;
        const roi = (netProfit / INITIAL_INVESTMENT) * 100;

        return {
            soldUnits, unsoldUnits, estimationError, totalSales,
            totalPropio, totalSub, totalSalaries, trainingBudget,
            cogs, grossProfit, maintenanceCost, gastosFinancieros: shortTermDebt,
            gastosAP: marketingSpend, ebitda, ebit, ebt, taxAmount, netProfit, roi,
            subAlertFired: false, ptd, dr, projectedSoldUnits
        };
    }

    // --- HTML UI UPDATERS ---
    function updateResultsUI_R1(f, groupData, myDR, tech2FinancingGap, hasTech2, tech2Cost) {
        document.getElementById("res-ventas").innerText = formatCurr(f.totalSales);
        document.getElementById("res-costo-propio").innerText = formatCurr(f.totalPropio + f.totalSalaries + f.trainingBudget);
        document.getElementById("row-costo-sub").style.display = f.totalSub > 0 ? "flex" : "none";
        document.getElementById("res-costo-sub").innerText = formatCurr(f.totalSub);

        const resGross = document.getElementById("res-gross");
        resGross.innerText = formatCurr(f.grossProfit);
        resGross.style.color = f.grossProfit >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("row-maintenance").style.display = f.maintenanceCost > 0 ? "flex" : "none";
        document.getElementById("res-maintenance").innerText = formatCurr(f.maintenanceCost);
        document.getElementById("res-finance-cp").innerText = formatCurr(groupData.baseShortTermDebt);

        const rowTech2Finance = document.getElementById("row-tech2-finance");
        if (hasTech2 && tech2FinancingGap > 0) {
            rowTech2Finance.style.display = "flex";
            document.getElementById("res-tech2-finance").innerText = formatCurr(tech2FinancingGap);
        } else {
            rowTech2Finance.style.display = "none";
        }

        document.getElementById("res-ap").innerText = formatCurr(f.gastosAP);

        const resEbitda = document.getElementById("res-ebitda");
        resEbitda.innerText = formatCurr(f.ebitda);
        resEbitda.style.color = f.ebitda >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("res-amortization").innerText = formatCurr(AMORTIZATION);

        const resEbit = document.getElementById("res-ebit");
        resEbit.innerText = formatCurr(f.ebit);
        resEbit.style.color = f.ebit >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("row-long-term").style.display = groupData.longTermDebt > 0 ? "flex" : "none";
        document.getElementById("res-long-term").innerText = formatCurr(groupData.longTermDebt);

        const resEbt = document.getElementById("res-ebt");
        resEbt.innerText = formatCurr(f.ebt);
        resEbt.style.color = f.ebt >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("res-tax").innerText = formatCurr(f.taxAmount);

        const resUtilidad = document.getElementById("res-utilidad");
        resUtilidad.innerText = formatCurr(f.netProfit);
        resUtilidad.style.color = f.netProfit >= 0 ? "var(--accent)" : "var(--danger)";

        const rowTech2Summary = document.getElementById("row-tech2-summary");
        if (hasTech2) {
            rowTech2Summary.style.display = "flex";
            const netCover = Math.min(f.netProfit, tech2Cost);
            document.getElementById("res-tech2-summary-text").innerHTML = `✨ <b>Tecnología 2:</b> ${formatCurr(tech2Cost)} | Cubierto Utilidad Neta: ${formatCurr(netCover)}${tech2FinancingGap > 0 ? ` | Gasto Fin. Adicional: ${formatCurr(tech2FinancingGap)}` : ""}`;
        } else {
            rowTech2Summary.style.display = "none";
        }

        const resRoi = document.getElementById("res-roi");
        resRoi.innerText = f.roi.toFixed(2) + "%";
        resRoi.style.color = f.roi >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("kpi-demand").innerText = myDR + " un.";
        document.getElementById("kpi-sold").innerText = f.soldUnits + " un.";
        document.getElementById("kpi-stock").innerText = f.unsoldUnits + " un.";

        const kpiErr = document.getElementById("kpi-estimation-error");
        kpiErr.innerText = (f.estimationError > 0 ? "+" : "") + f.estimationError + " un.";
        kpiErr.style.color = f.estimationError === 0 ? "var(--accent)" : "var(--danger)";
    }

    function updateResultsUI_R2(f, groupData, myDR) {
        document.getElementById("res-ventas").innerText = formatCurr(f.totalSales);
        document.getElementById("res-costo-propio").innerText = formatCurr(f.totalPropio + f.totalSalaries + f.trainingBudget);
        document.getElementById("row-costo-sub").style.display = f.totalSub > 0 ? "flex" : "none";
        document.getElementById("res-costo-sub").innerText = formatCurr(f.totalSub);

        const resGross = document.getElementById("res-gross");
        resGross.innerText = formatCurr(f.grossProfit);
        resGross.style.color = f.grossProfit >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("row-maintenance").style.display = f.maintenanceCost > 0 ? "flex" : "none";
        document.getElementById("res-maintenance").innerText = formatCurr(f.maintenanceCost);
        document.getElementById("res-finance-cp").innerText = formatCurr(f.gastosFinancieros);

        document.getElementById("row-tech2-finance").style.display = "none";
        document.getElementById("row-tech2-summary").style.display = "none";

        document.getElementById("res-ap").innerText = formatCurr(f.gastosAP);

        const resEbitda = document.getElementById("res-ebitda");
        resEbitda.innerText = formatCurr(f.ebitda);
        resEbitda.style.color = f.ebitda >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("res-amortization").innerText = formatCurr(AMORTIZATION);

        const resEbit = document.getElementById("res-ebit");
        resEbit.innerText = formatCurr(f.ebit);
        resEbit.style.color = f.ebit >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("row-long-term").style.display = groupData.longTermDebt > 0 ? "flex" : "none";
        document.getElementById("res-long-term").innerText = formatCurr(groupData.longTermDebt);

        const resEbt = document.getElementById("res-ebt");
        resEbt.innerText = formatCurr(f.ebt);
        resEbt.style.color = f.ebt >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("res-tax").innerText = formatCurr(f.taxAmount);

        const resUtilidad = document.getElementById("res-utilidad");
        resUtilidad.innerText = formatCurr(f.netProfit);
        resUtilidad.style.color = f.netProfit >= 0 ? "var(--accent)" : "var(--danger)";

        const resRoi = document.getElementById("res-roi");
        resRoi.innerText = f.roi.toFixed(2) + "%";
        resRoi.style.color = f.roi >= 0 ? "var(--accent)" : "var(--danger)";

        document.getElementById("kpi-demand").innerText = myDR + " un.";
        document.getElementById("kpi-sold").innerText = f.soldUnits + " un.";
        document.getElementById("kpi-stock").innerText = f.unsoldUnits + " un.";

        const kpiErr = document.getElementById("kpi-estimation-error");
        kpiErr.innerText = (f.estimationError > 0 ? "+" : "") + f.estimationError + " un.";
        kpiErr.style.color = f.estimationError === 0 ? "var(--accent)" : "var(--danger)";
    }

    function updateInsights(f, groupData, myDR, totalGroups, mtd) {
        const insightBox = document.getElementById("insight-box");
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

    function showError(msg) {
        errorBox.innerText = msg;
        errorBox.classList.remove("hidden");
    }

    // --- CHART GLOBALS ---
    function updateChartsGlobal() {
        const conf = getAdminConfig();
        const mtd = conf.mtd;

        // Decide what to graph: Ideally plot Round 2 if groups exist in R2, else plot R1
        const g2 = getGroupsData(2);
        const g1 = getGroupsData(1);
        const isR2 = g2.length > 0;
        const targetGroups = isR2 ? g2 : g1;

        if (targetGroups.length === 0) return; // Nothing to plot yet

        const allDemands = calcAllDemands(targetGroups, mtd);

        const allFinancials = targetGroups.map(group => {
            const demandEntry = allDemands.find(d => d.name === group.name);
            const dr = demandEntry ? demandEntry.dr : 0;
            const f = isR2 ? calcGroupFinancials_R2(group, dr) : calcGroupFinancials(group, dr);
            return { name: group.name, units: f.soldUnits, profit: f.netProfit };
        });

        allFinancials.sort((a, b) => b.profit - a.profit);
        const labels = allFinancials.map(g => g.name);
        const dataUnits = allFinancials.map(g => g.units);
        const dataProfit = allFinancials.map(g => g.profit);

        Chart.defaults.color = '#64748b';
        Chart.defaults.font.family = "'Inter', sans-serif";

        if (rankingChartUnits) {
            rankingChartUnits.data.labels = labels;
            rankingChartUnits.data.datasets[0].data = dataUnits;
            rankingChartUnits.update();
        } else {
            const ctxU = document.getElementById('rankingChartUnits').getContext('2d');
            rankingChartUnits = new Chart(ctxU, {
                type: 'line',
                data: {
                    labels, datasets: [{
                        label: 'Ventas Efectivas', data: dataUnits,
                        backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', borderWidth: 2,
                        pointBackgroundColor: '#fff', pointBorderColor: '#38bdf8', fill: true, tension: 0.3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
                }
            });
        }

        const profitBGs = dataProfit.map(val => val >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)');
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
                    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
                }
            });
        }
    }
});
