document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("sim-form");
    const errorBox = document.getElementById("error-message");

    // View elements
    const resultsData = document.getElementById("results-data");
    const emptyState = document.getElementById("empty-state");

    const resVentas = document.getElementById("res-ventas");
    const resCostoPropio = document.getElementById("res-costo-propio");
    const resCostoSub = document.getElementById("res-costo-sub");
    const resGross = document.getElementById("res-gross");
    const resFinanceCp = document.getElementById("res-finance-cp");
    const resAp = document.getElementById("res-ap");
    const resEbitda = document.getElementById("res-ebitda");
    const resAmortization = document.getElementById("res-amortization");
    const resEbit = document.getElementById("res-ebit");
    const resLongTerm = document.getElementById("res-long-term");
    const resEbt = document.getElementById("res-ebt");
    const resTax = document.getElementById("res-tax");
    const resUtilidad = document.getElementById("res-utilidad");
    const resRoi = document.getElementById("res-roi");

    // Rows to hide/show dynamically
    const rowLongTerm = document.getElementById("row-long-term");
    const rowCostoSub = document.getElementById("row-costo-sub");

    const kpiDemand = document.getElementById("kpi-demand");
    const kpiSold = document.getElementById("kpi-sold");
    const kpiStock = document.getElementById("kpi-stock");
    const kpiEstimationError = document.getElementById("kpi-estimation-error");
    const insightBox = document.getElementById("insight-box");
    const prodCostInput = document.getElementById("prod_cost");
    const priceInput = document.getElementById("price");
    const groupCounter = document.getElementById("group-counter");

    // Chart elements and state
    let rankingChartUnits = null;
    let rankingChartProfit = null;

    /**
     * groupResults: Ronda 1 entries
     * { name, price, marketingSpend, ia, plantUnits, subUnits,
     *   prodCost, estimatedSales, employees, salaryPerEmployee,
     *   trainingBudget, shortTermDebt, longTermDebt,
     *   maintenanceCostPerUnit, tax, costAdj, marketingAdj, mtd,
     *   buyTech2, tech2Cost, tech2FinancingGap, hasTech2 }
     *
     * groupResults_R2: Ronda 2 entries
     * { name, price, marketingSpend, ia, estimatedSales, employees,
     *   salaryPerEmployee, trainingBudget, shortTermDebt, longTermDebt,
     *   maintenanceCostPerUnit, tax, costAdj, marketingAdj, mtd,
     *   hasTech2,
     *   prodCostT1, prodCostT2,
     *   plantT1, plantT2, subT1, subT2 }
     */
    let groupResults = [];
    let groupResults_R2 = [];

    // Current round state
    let currentRound = 1;

    // ─── MOTOR DE MERCADO — Parámetros ────────────────────────
    const WP = 0.6; // Sensibilidad al Precio
    const WM = 0.4; // Sensibilidad al Marketing
    const SUB_CAP = 300;    // Máximo subcontratación Ronda 1
    const SUB_PENALTY = 1.5; // Recargo del 50% sobre CP (Ronda 1)
    const INITIAL_INVESTMENT = 500000;
    const AMORTIZATION = 25000;  // 5% de 500,000
    const MAX_GROUPS = 5;

    const formatCurr = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    // ─── SWITCH DE RONDA ───────────────────────────────────────
    window.switchRound = function (round) {
        currentRound = round;

        document.getElementById("tab-r1").classList.toggle("active", round === 1);
        document.getElementById("tab-r2").classList.toggle("active", round === 2);

        document.getElementById("ops-r1").classList.toggle("hidden", round !== 1);
        document.getElementById("ops-r2").classList.toggle("hidden", round !== 2);

        document.getElementById("results-round-badge").textContent = `Ronda ${round}`;

        // In round 2: adapt operations section per current group name
        if (round === 2) {
            adaptRound2Ops();
        }

        // Reset results on round switch
        resultsData.classList.add("hidden");
        emptyState.classList.remove("hidden");
    };

    // ─── ADAPTAR OPERACIONES R2 POR GRUPO ─────────────────────
    function adaptRound2Ops() {
        const groupName = document.getElementById("group_name").value.trim();
        const r1Group = groupResults.find(g => g.name === groupName);
        const hasTech2 = r1Group ? r1Group.hasTech2 : false;

        document.getElementById("ops-r2-no-tech2").classList.toggle("hidden", hasTech2);
        document.getElementById("ops-r2-with-tech2").classList.toggle("hidden", !hasTech2);
    }

    // ─── AUTO ADAPT WHEN GROUP NAME CHANGES ───────────────────
    document.getElementById("group_name").addEventListener("input", () => {
        if (currentRound === 2) adaptRound2Ops();
        updateGroupCounter();
    });

    // ─── ACTUALIZAR CONTADOR ───────────────────────────────────
    function updateGroupCounter() {
        const total = groupResults.length;
        groupCounter.textContent = `${total} / ${MAX_GROUPS} grupos`;
        groupCounter.classList.toggle("counter-full", total >= MAX_GROUPS);
    }
    updateGroupCounter();

    // ─── TECH2 COST BADGE SYNC ────────────────────────────────
    const tech2CostInput = document.getElementById("tech2_cost");
    const tech2CostBadge = document.getElementById("tech2-cost-badge");

    function updateTech2Badge() {
        const val = parseFloat(tech2CostInput.value);
        if (!isNaN(val) && val > 0) {
            tech2CostBadge.textContent = formatCurr(val);
        } else {
            tech2CostBadge.textContent = "$0.00";
        }
    }
    tech2CostInput.addEventListener("input", updateTech2Badge);
    updateTech2Badge();

    // Show/hide short-term hint when tech2 is toggled
    const buyTech2Checkbox = document.getElementById("buy_tech2");
    buyTech2Checkbox.addEventListener("change", () => {
        const hint = document.getElementById("short-term-tech2-hint");
        hint.style.display = buyTech2Checkbox.checked ? "block" : "none";
    });

    // ─── SUGERENCIA DE PRECIO ─────────────────────────────────
    const priceHint = document.createElement('small');
    priceHint.className = 'hint suggestion-hint';
    priceHint.style.color = '#0f172a';
    priceInput.parentNode.insertBefore(priceHint, priceInput.nextSibling);

    prodCostInput.addEventListener('input', () => {
        const cost = parseFloat(prodCostInput.value);
        if (cost > 0) {
            const minSugg = (cost * 1.5).toFixed(2);
            const maxSugg = (cost * 2.5).toFixed(2);
            priceHint.innerText = `💡 Sugerencia competitiva: $${minSugg} - $${maxSugg}`;
        } else {
            priceHint.innerText = '';
        }
    });

    // ─── FÓRMULA DE ATRACTIVIDAD ──────────────────────────────
    function calcIA(price, marketingSpend) {
        return (WM * marketingSpend) + (WP * (1 / price * 1000));
    }

    // ─── RECALCULAR DR PARA TODOS LOS EQUIPOS ─────────────────
    function calcAllDemands(sourceResults, mtd) {
        const totalIA = sourceResults.reduce((sum, g) => sum + g.ia, 0);
        if (totalIA === 0) return sourceResults.map(g => ({ name: g.name, dr: 0 }));
        return sourceResults.map(g => ({
            name: g.name,
            dr: Math.floor(mtd * (g.ia / totalIA))
        }));
    }

    // ─── CALCULAR FINANCIEROS RONDA 1 ─────────────────────────
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

        let soldUnits = Math.min(dr, ptd);
        let projectedSoldUnits = Math.floor(dr + (dr * (marketingAdj / 100)));
        soldUnits = Math.min(projectedSoldUnits, ptd);

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

    // ─── CALCULAR FINANCIEROS RONDA 2 ─────────────────────────
    function calcGroupFinancials_R2(group, dr) {
        const {
            price, estimatedSales, employees, salaryPerEmployee,
            trainingBudget, shortTermDebt, longTermDebt,
            maintenanceCostPerUnit, tax, costAdj, marketingAdj, marketingSpend,
            hasTech2, prodCostT1, prodCostT2
        } = group;

        const trainingDiscountPercent = Math.floor(trainingBudget / 10000) * 0.01;

        // Plant & Sub quantities (fixed per tech2 status)
        let plantT1, plantT2, subT1, subT2;
        let subCostT1, subCostT2;
        let subAlertFired = false;

        if (hasTech2) {
            plantT1 = 1500;
            plantT2 = 1000;
            subT1 = 500;
            subT2 = 300;
            subCostT1 = prodCostT1 * 1.15;
            subCostT2 = prodCostT2 * 1.20;
        } else {
            plantT1 = 3000;
            plantT2 = 0;
            subT1 = 500;
            subT2 = 0;
            subCostT1 = prodCostT1 * 1.05;
            subCostT2 = 0;
        }

        // Apply training discount to unit costs
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
            subAlertFired, ptd, dr, projectedSoldUnits,
            plantT1, plantT2, subT1, subT2
        };
    }

    // ─── SUBMIT HANDLER ───────────────────────────────────────
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorBox.classList.add("hidden");
        errorBox.innerText = "";

        const groupNameInput = document.getElementById("group_name");
        if (!groupNameInput) {
            showError("❌ Error de sistema: No se encontró el campo 'Nombre del Grupo'.");
            return;
        }
        const groupName = groupNameInput.value.trim();
        if (!groupName) {
            showError("❌ Error lógico: Debes ingresar el nombre del grupo.");
            return;
        }

        if (currentRound === 1) {
            processRound1(groupName);
        } else {
            processRound2(groupName);
        }
    });

    // ─── PROCESAR RONDA 1 ─────────────────────────────────────
    function processRound1(groupName) {
        // Check if new group exceeds cap
        const existingIndex = groupResults.findIndex(g => g.name === groupName);
        if (existingIndex === -1 && groupResults.length >= MAX_GROUPS) {
            showError(`❌ Límite alcanzado: El simulador soporta un máximo de ${MAX_GROUPS} grupos. No se pueden añadir más equipos.`);
            return;
        }

        // Collect Inputs
        const mtd = parseInt(document.getElementById("mtd").value);
        const costAdj = parseFloat(document.getElementById("cost_adj").value);
        const marketingAdj = parseFloat(document.getElementById("marketing_adj").value);
        const tax = parseFloat(document.getElementById("tax").value);

        const prodCost = parseFloat(document.getElementById("prod_cost").value);
        const plantUnits = parseInt(document.getElementById("plant_units").value);
        const subUnitsRaw = parseInt(document.getElementById("sub_units").value);

        const price = parseFloat(document.getElementById("price").value);
        const estimatedSales = parseInt(document.getElementById("estimated_sales").value);
        const marketingSpend = parseFloat(document.getElementById("marketing_spend").value);

        const employees = parseInt(document.getElementById("employees").value);
        const salaryPerEmployee = parseFloat(document.getElementById("salary_per_employee").value);
        const trainingBudget = parseFloat(document.getElementById("training_budget").value);

        const shortTermDebt = parseFloat(document.getElementById("short_term_debt").value);
        const longTermDebt = parseFloat(document.getElementById("long_term_debt").value);
        const maintenanceCostPerUnit = parseFloat(document.getElementById("maintenance_cost").value);

        const buyTech2 = document.getElementById("buy_tech2").checked;
        const tech2Cost = parseFloat(document.getElementById("tech2_cost").value) || 0;

        // Validations
        if (isNaN(mtd) || mtd <= 0) {
            showError("❌ Error lógico: El Mercado Total Disponible (MTD) debe ser mayor a 0."); return;
        }
        if (plantUnits > 2000) {
            showError("❌ Límite excedido: La planta solo tiene capacidad productiva máxima de 2,000 unidades."); return;
        }
        if (price <= 0 || prodCost <= 0) {
            showError("❌ Error lógico: El precio y el costo unitario deben ser mayores a $0."); return;
        }
        if (isNaN(costAdj) || isNaN(marketingAdj) || isNaN(estimatedSales)) {
            showError("❌ Error lógico: Revisa que todos los campos estén completos."); return;
        }
        if (employees < 1 || salaryPerEmployee < 0 || trainingBudget < 0) {
            showError("❌ Error lógico: Debes configurar correctamente a tu personal."); return;
        }

        const subUnits = subUnitsRaw;
        const ia = calcIA(price, marketingSpend);

        // Temporary group data for Tech2 net profit check
        const tempGroupData = {
            name: groupName, price, marketingSpend, ia,
            plantUnits, subUnits, prodCost, estimatedSales,
            employees, salaryPerEmployee, trainingBudget,
            shortTermDebt, longTermDebt, maintenanceCostPerUnit,
            tax, costAdj, marketingAdj, mtd
        };

        // Temporarily update groupResults to compute correct DR
        const tempResults = [...groupResults];
        const tempIdx = tempResults.findIndex(g => g.name === groupName);
        if (tempIdx !== -1) tempResults[tempIdx] = tempGroupData;
        else tempResults.push(tempGroupData);

        const tempDemands = calcAllDemands(tempResults, mtd);
        const tempDR = tempDemands.find(d => d.name === groupName).dr;
        const tempF = calcGroupFinancials(tempGroupData, tempDR);

        // Tech2 validation
        let tech2FinancingGap = 0;
        let hasTech2 = false;
        if (buyTech2) {
            if (tempF.netProfit <= 0) {
                showError(`❌ No es posible adquirir la Tecnología 2: La Utilidad Neta del período es ${formatCurr(tempF.netProfit)}, que es negativa o cero. Se requiere utilidad positiva para esta inversión.`);
                return;
            }
            tech2FinancingGap = Math.max(0, tech2Cost - tempF.netProfit);
            hasTech2 = true;
        }

        // Final group data with Tech2 gap added to short-term debt
        const finalShortTermDebt = shortTermDebt + tech2FinancingGap;
        const groupData = {
            name: groupName, price, marketingSpend, ia,
            plantUnits, subUnits, prodCost, estimatedSales,
            employees, salaryPerEmployee, trainingBudget,
            shortTermDebt: finalShortTermDebt, longTermDebt, maintenanceCostPerUnit,
            tax, costAdj, marketingAdj, mtd,
            buyTech2, tech2Cost, tech2FinancingGap, hasTech2,
            baseShortTermDebt: shortTermDebt
        };

        if (existingIndex !== -1) {
            groupResults[existingIndex] = groupData;
        } else {
            groupResults.push(groupData);
        }
        updateGroupCounter();

        const allDemands = calcAllDemands(groupResults, mtd);
        const myDR = allDemands.find(d => d.name === groupName).dr;
        const f = calcGroupFinancials(groupData, myDR);

        updateResultsUI_R1(f, groupData, myDR, tech2FinancingGap, hasTech2, tech2Cost);
        updateInsights(f, groupData, myDR, groupResults.length, mtd);
        updateCharts(allDemands, groupResults);

        emptyState.classList.add("hidden");
        resultsData.classList.remove("hidden");
    }

    // ─── PROCESAR RONDA 2 ─────────────────────────────────────
    function processRound2(groupName) {
        // Must have a Round 1 entry
        const r1Group = groupResults.find(g => g.name === groupName);
        if (!r1Group) {
            showError(`❌ El grupo "${groupName}" no tiene datos de Ronda 1. Primero debe completar la Ronda 1.`);
            return;
        }

        // Check if new round-2 entry exceeds cap
        const existingIndex_R2 = groupResults_R2.findIndex(g => g.name === groupName);
        if (existingIndex_R2 === -1 && groupResults_R2.length >= MAX_GROUPS) {
            showError(`❌ Límite alcanzado: El simulador soporta un máximo de ${MAX_GROUPS} grupos.`);
            return;
        }

        const hasTech2 = r1Group.hasTech2;

        // Collect shared inputs
        const mtd = parseInt(document.getElementById("mtd").value);
        const costAdj = parseFloat(document.getElementById("cost_adj").value);
        const marketingAdj = parseFloat(document.getElementById("marketing_adj").value);
        const tax = parseFloat(document.getElementById("tax").value);
        const price = parseFloat(document.getElementById("price").value);
        const estimatedSales = parseInt(document.getElementById("estimated_sales").value);
        const marketingSpend = parseFloat(document.getElementById("marketing_spend").value);
        const employees = parseInt(document.getElementById("employees").value);
        const salaryPerEmployee = parseFloat(document.getElementById("salary_per_employee").value);
        const trainingBudget = parseFloat(document.getElementById("training_budget").value);
        const shortTermDebt = parseFloat(document.getElementById("short_term_debt").value);
        const longTermDebt = parseFloat(document.getElementById("long_term_debt").value);
        const maintenanceCostPerUnit = parseFloat(document.getElementById("maintenance_cost").value);

        // Collect production costs based on tech2 status
        let prodCostT1, prodCostT2;
        if (hasTech2) {
            prodCostT1 = parseFloat(document.getElementById("r2_prod_cost_t1_tech").value);
            prodCostT2 = parseFloat(document.getElementById("r2_prod_cost_t2").value);
            if (isNaN(prodCostT2) || prodCostT2 <= 0) {
                showError("❌ Debes ingresar el Costo Unitario de Producción de Tecnología 2."); return;
            }
        } else {
            prodCostT1 = parseFloat(document.getElementById("r2_prod_cost_t1").value);
            prodCostT2 = 0;
        }

        // Validations
        if (isNaN(mtd) || mtd <= 0) { showError("❌ MTD debe ser mayor a 0."); return; }
        if (price <= 0 || prodCostT1 <= 0) { showError("❌ El precio y el costo unitario deben ser mayores a $0."); return; }
        if (isNaN(costAdj) || isNaN(marketingAdj) || isNaN(estimatedSales)) { showError("❌ Revisa que todos los campos estén completos."); return; }
        if (employees < 1 || salaryPerEmployee < 0 || trainingBudget < 0) { showError("❌ Debes configurar correctamente a tu personal."); return; }

        const ia = calcIA(price, marketingSpend);

        const groupData_R2 = {
            name: groupName, price, marketingSpend, ia,
            estimatedSales, employees, salaryPerEmployee, trainingBudget,
            shortTermDebt, longTermDebt, maintenanceCostPerUnit,
            tax, costAdj, marketingAdj, mtd,
            hasTech2, prodCostT1, prodCostT2
        };

        if (existingIndex_R2 !== -1) {
            groupResults_R2[existingIndex_R2] = groupData_R2;
        } else {
            groupResults_R2.push(groupData_R2);
        }

        const allDemands_R2 = calcAllDemands(groupResults_R2, mtd);
        const myDR = allDemands_R2.find(d => d.name === groupName).dr;
        const f = calcGroupFinancials_R2(groupData_R2, myDR);

        updateResultsUI_R2(f, groupData_R2, myDR);
        updateInsights(f, groupData_R2, myDR, groupResults_R2.length, mtd);
        updateCharts(allDemands_R2, groupResults_R2, true);

        emptyState.classList.add("hidden");
        resultsData.classList.remove("hidden");
    }

    // ─── ACTUALIZAR UI RESULTADOS R1 ──────────────────────────
    function updateResultsUI_R1(f, groupData, myDR, tech2FinancingGap, hasTech2, tech2Cost) {
        resVentas.innerText = formatCurr(f.totalSales);

        const costoProduccion = f.totalPropio + f.totalSalaries + f.trainingBudget;
        resCostoPropio.innerText = formatCurr(costoProduccion);

        rowCostoSub.style.display = f.totalSub > 0 ? "flex" : "none";
        resCostoSub.innerText = formatCurr(f.totalSub);

        resGross.innerText = formatCurr(f.grossProfit);
        resGross.style.color = f.grossProfit >= 0 ? "var(--accent)" : "var(--danger)";

        const rowMaintenance = document.getElementById("row-maintenance");
        rowMaintenance.style.display = f.maintenanceCost > 0 ? "flex" : "none";
        document.getElementById("res-maintenance").innerText = formatCurr(f.maintenanceCost);

        // Show base short-term debt
        resFinanceCp.innerText = formatCurr(groupData.baseShortTermDebt);

        // Tech2 financing gap row
        const rowTech2Finance = document.getElementById("row-tech2-finance");
        const resTech2Finance = document.getElementById("res-tech2-finance");
        if (hasTech2 && tech2FinancingGap > 0) {
            rowTech2Finance.style.display = "flex";
            resTech2Finance.innerText = formatCurr(tech2FinancingGap);
        } else {
            rowTech2Finance.style.display = "none";
        }

        resAp.innerText = formatCurr(f.gastosAP);

        resEbitda.innerText = formatCurr(f.ebitda);
        resEbitda.style.color = f.ebitda >= 0 ? "var(--accent)" : "var(--danger)";

        resAmortization.innerText = formatCurr(AMORTIZATION);

        resEbit.innerText = formatCurr(f.ebit);
        resEbit.style.color = f.ebit >= 0 ? "var(--accent)" : "var(--danger)";

        rowLongTerm.style.display = groupData.longTermDebt > 0 ? "flex" : "none";
        resLongTerm.innerText = formatCurr(groupData.longTermDebt);

        resEbt.innerText = formatCurr(f.ebt);
        resEbt.style.color = f.ebt >= 0 ? "var(--accent)" : "var(--danger)";

        resTax.innerText = formatCurr(f.taxAmount);

        resUtilidad.innerText = formatCurr(f.netProfit);
        resUtilidad.style.color = f.netProfit >= 0 ? "var(--accent)" : "var(--danger)";

        // Tech2 summary
        const rowTech2Summary = document.getElementById("row-tech2-summary");
        const resTech2SummaryText = document.getElementById("res-tech2-summary-text");
        if (hasTech2) {
            rowTech2Summary.style.display = "flex";
            const netCover = Math.min(f.netProfit, tech2Cost);
            resTech2SummaryText.innerHTML = `✨ <b>Tecnología 2 adquirida:</b> ${formatCurr(tech2Cost)} — Cubierto con Utilidad Neta: ${formatCurr(netCover)}${tech2FinancingGap > 0 ? ` | Gasto Financiero CP adicional: ${formatCurr(tech2FinancingGap)}` : " | Cubierto completamente con utilidad neta 🎉"}`;
        } else {
            rowTech2Summary.style.display = "none";
        }

        resRoi.innerText = f.roi.toFixed(2) + "%";
        resRoi.style.color = f.roi >= 0 ? "var(--accent)" : "var(--danger)";

        kpiDemand.innerText = myDR + " unid.";
        kpiSold.innerText = f.soldUnits + " unid.";
        kpiStock.innerText = f.unsoldUnits + " unid.";

        const errText = f.estimationError > 0 ? `+${f.estimationError} unid.` : `${f.estimationError} unid.`;
        kpiEstimationError.innerText = errText;
        kpiEstimationError.style.color = f.estimationError === 0 ? "var(--accent)" : "var(--danger)";
    }

    // ─── ACTUALIZAR UI RESULTADOS R2 ──────────────────────────
    function updateResultsUI_R2(f, groupData, myDR) {
        resVentas.innerText = formatCurr(f.totalSales);

        const costoProduccion = f.totalPropio + f.totalSalaries + f.trainingBudget;
        resCostoPropio.innerText = formatCurr(costoProduccion);

        rowCostoSub.style.display = f.totalSub > 0 ? "flex" : "none";
        resCostoSub.innerText = formatCurr(f.totalSub);

        resGross.innerText = formatCurr(f.grossProfit);
        resGross.style.color = f.grossProfit >= 0 ? "var(--accent)" : "var(--danger)";

        const rowMaintenance = document.getElementById("row-maintenance");
        rowMaintenance.style.display = f.maintenanceCost > 0 ? "flex" : "none";
        document.getElementById("res-maintenance").innerText = formatCurr(f.maintenanceCost);

        resFinanceCp.innerText = formatCurr(f.gastosFinancieros);
        document.getElementById("row-tech2-finance").style.display = "none";
        document.getElementById("row-tech2-summary").style.display = "none";

        resAp.innerText = formatCurr(f.gastosAP);

        resEbitda.innerText = formatCurr(f.ebitda);
        resEbitda.style.color = f.ebitda >= 0 ? "var(--accent)" : "var(--danger)";

        resAmortization.innerText = formatCurr(AMORTIZATION);

        resEbit.innerText = formatCurr(f.ebit);
        resEbit.style.color = f.ebit >= 0 ? "var(--accent)" : "var(--danger)";

        rowLongTerm.style.display = groupData.longTermDebt > 0 ? "flex" : "none";
        resLongTerm.innerText = formatCurr(groupData.longTermDebt);

        resEbt.innerText = formatCurr(f.ebt);
        resEbt.style.color = f.ebt >= 0 ? "var(--accent)" : "var(--danger)";

        resTax.innerText = formatCurr(f.taxAmount);

        resUtilidad.innerText = formatCurr(f.netProfit);
        resUtilidad.style.color = f.netProfit >= 0 ? "var(--accent)" : "var(--danger)";

        resRoi.innerText = f.roi.toFixed(2) + "%";
        resRoi.style.color = f.roi >= 0 ? "var(--accent)" : "var(--danger)";

        kpiDemand.innerText = myDR + " unid.";
        kpiSold.innerText = f.soldUnits + " unid.";
        kpiStock.innerText = f.unsoldUnits + " unid.";

        const errText = f.estimationError > 0 ? `+${f.estimationError} unid.` : `${f.estimationError} unid.`;
        kpiEstimationError.innerText = errText;
        kpiEstimationError.style.color = f.estimationError === 0 ? "var(--accent)" : "var(--danger)";
    }

    // ─── MENSAJES EDUCATIVOS ───────────────────────────────────
    function updateInsights(f, groupData, myDR, totalGroups, mtd) {
        let insightMsg = "";

        if (f.subAlertFired) {
            insightMsg += `⚠️ <b>Alerta de Subcontratación:</b> El sistema aplicó el tope automáticamente.<br><br>`;
        }

        const marginRatio = groupData.price / (groupData.prodCostT1 || groupData.prodCost || 1);
        if (marginRatio < 1) {
            insightMsg += "🚨 <b>Guerra de Precios:</b> Tu precio de venta es menor a tu costo base. Estás destruyendo tu rentabilidad.";
        } else {
            insightMsg += "✅ <b>Operación:</b> Tu precio cubre los costos base de producción.";
        }

        if (f.unsoldUnits > 0) {
            insightMsg += `<br><br>📦 <b>Exceso de Inventario (${f.unsoldUnits} unid.):</b> Produciste más de lo que el mercado te asignó. Ese capital inmovilizado genera costos de mantenimiento.`;
        } else if (f.soldUnits === f.ptd && myDR > f.ptd) {
            insightMsg += `<br><br>🔥 <b>Quiebre de Stock (${myDR - f.ptd} unid.):</b> El mercado te hubiera comprado más pero no tenías stock. Costo de oportunidad perdido.`;
        } else if (f.unsoldUnits === 0 && myDR === f.ptd) {
            insightMsg += `<br><br>🎯 <b>Equilibrio Perfecto:</b> ¡Alineaste tu producción exactamente con tu demanda real!`;
        }

        if (f.estimationError > 0) {
            insightMsg += `<br><br>📊 <b>Error de Estimación (+${f.estimationError} unid.):</b> Sobreestimaste tu demanda.`;
        } else if (f.estimationError < 0) {
            insightMsg += `<br><br>📊 <b>Error de Estimación (${f.estimationError} unid.):</b> Subestimaste tu demanda.`;
        } else {
            insightMsg += `<br><br>🎯 <b>Estimación Perfecta:</b> ¡Predijiste exactamente la demanda que el mercado te asignó!`;
        }

        if (totalGroups > 1) {
            insightMsg += `<br><br>🏆 <b>Mercado Competitivo:</b> Hay ${totalGroups} equipos compitiendo por ${mtd.toLocaleString()} unidades totales. Tu cuota: ${myDR} unid. (${((myDR / mtd) * 100).toFixed(1)}% del mercado).`;
        }

        insightBox.innerHTML = insightMsg;
    }

    // ─── GRÁFICOS ──────────────────────────────────────────────
    function updateCharts(allDemands, source, isR2 = false) {
        const allFinancials = source.map(group => {
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

        // Units Chart
        if (rankingChartUnits) {
            rankingChartUnits.data.labels = labels;
            rankingChartUnits.data.datasets[0].data = dataUnits;
            rankingChartUnits.update();
        } else {
            const ctxU = document.getElementById('rankingChartUnits').getContext('2d');
            rankingChartUnits = new Chart(ctxU, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Ventas Efectivas',
                        data: dataUnits,
                        backgroundColor: 'rgba(56, 189, 248, 0.2)',
                        borderColor: '#38bdf8',
                        borderWidth: 2,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#38bdf8',
                        pointHoverBackgroundColor: '#38bdf8',
                        pointHoverBorderColor: '#fff',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Profit Chart
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
                    labels,
                    datasets: [{
                        label: 'Utilidad Neta ($)',
                        data: dataProfit,
                        backgroundColor: profitBGs,
                        borderColor: profitBorders,
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    function showError(msg) {
        errorBox.innerText = msg;
        errorBox.classList.remove("hidden");
        resultsData.classList.add("hidden");
        emptyState.classList.remove("hidden");
    }
});
