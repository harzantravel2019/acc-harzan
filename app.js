const STORAGE_KEY = "harzan-travel-accounting";
const SOFT_DELETE_RETENTION_DAYS = 14;
const THEME_KEY = "harzan-travel-theme";

const state = loadState();
const currentPage = document.body.dataset.page ?? "";

const refs = {
  customerForm: document.getElementById("customerForm"),
  customerFormTitle: document.getElementById("customerFormTitle"),
  customerSubmitBtn: document.getElementById("customerSubmitBtn"),
  customerCancelEdit: document.getElementById("customerCancelEdit"),
  debtForm: document.getElementById("debtForm"),
  debtFormTitle: document.getElementById("debtFormTitle"),
  debtSubmitBtn: document.getElementById("debtSubmitBtn"),
  debtCancelEdit: document.getElementById("debtCancelEdit"),
  paymentForm: document.getElementById("paymentForm"),
  paymentFormTitle: document.getElementById("paymentFormTitle"),
  paymentSubmitBtn: document.getElementById("paymentSubmitBtn"),
  paymentCancelEdit: document.getElementById("paymentCancelEdit"),
  invoiceForm: document.getElementById("invoiceForm"),
  customerSearch: document.getElementById("customerSearch"),
  dashboardDebtSearch: document.getElementById("dashboardDebtSearch"),
  debtSearch: document.getElementById("debtSearch"),
  paymentSearch: document.getElementById("paymentSearch"),
  invoiceSearch: document.getElementById("invoiceSearch"),
  dashboardDebtTableBody: document.getElementById("dashboardDebtTableBody"),
  customerTableBody: document.getElementById("customerTableBody"),
  debtList: document.getElementById("debtList"),
  paymentList: document.getElementById("paymentList"),
  invoicePreview: document.getElementById("invoicePreview"),
  customerCount: document.getElementById("customerCount"),
  usdOutstanding: document.getElementById("usdOutstanding"),
  iqdOutstanding: document.getElementById("iqdOutstanding"),
  invoiceCount: document.getElementById("invoiceCount"),
  debtCustomer: document.getElementById("debtCustomer"),
  paymentCustomer: document.getElementById("paymentCustomer"),
  invoiceCustomer: document.getElementById("invoiceCustomer"),
  printInvoiceBtn: document.getElementById("printInvoiceBtn"),
  activityTemplate: document.getElementById("activityItemTemplate"),
  settingsToggleBtn: document.getElementById("settingsToggleBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  themeChoices: Array.from(document.querySelectorAll("[data-theme-value]")),
};

let activeInvoiceCustomerId = "";

bootstrap();

function bootstrap() {
  applyTheme(loadTheme());
  normalizeLegacyData();
  highlightCurrentPage();
  setDefaultDates();
  bindEvents();
  renderAll();
}

function bindEvents() {
  refs.customerForm?.addEventListener("submit", handleCustomerSubmit);
  refs.debtForm?.addEventListener("submit", handleDebtSubmit);
  refs.paymentForm?.addEventListener("submit", handlePaymentSubmit);
  refs.invoiceForm?.addEventListener("submit", (event) => event.preventDefault());
  refs.customerSearch?.addEventListener("input", renderCustomers);
  refs.dashboardDebtSearch?.addEventListener("input", renderDashboardDebts);
  refs.debtSearch?.addEventListener("input", handleDebtSearch);
  refs.paymentSearch?.addEventListener("input", handlePaymentSearch);
  refs.invoiceSearch?.addEventListener("input", handleInvoiceSearch);
  refs.invoiceCustomer?.addEventListener("change", handleInvoiceCustomerChange);
  refs.printInvoiceBtn?.addEventListener("click", handlePrintInvoice);
  refs.customerCancelEdit?.addEventListener("click", resetCustomerForm);
  refs.debtCancelEdit?.addEventListener("click", resetDebtForm);
  refs.paymentCancelEdit?.addEventListener("click", resetPaymentForm);
  refs.settingsToggleBtn?.addEventListener("click", toggleSettingsPanel);
  refs.themeChoices.forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.themeValue || "light");
      refs.settingsPanel?.classList.add("is-hidden");
    });
  });
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const customerId = formData.get("customerId").toString();
  const payload = {
    fullName: formData.get("fullName").toString().trim(),
    phone: formData.get("phone").toString().trim(),
    referenceName: formData.get("referenceName").toString().trim(),
    address: formData.get("address").toString().trim(),
  };

  if (isDuplicateCustomer(payload, customerId)) {
    window.alert("This customer is duplicated. A customer with the same data already exists.");
    return;
  }

  if (customerId) {
    const confirmed = window.confirm(
      "Confirm updating this customer? The saved customer data will be changed."
    );
    if (!confirmed) {
      return;
    }

    const customer = getCustomer(customerId);
    if (!customer) {
      return;
    }
    Object.assign(customer, payload);
  } else {
    state.customers.unshift({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }

  persistState();
  resetCustomerForm();
  renderAll();
}

function handleDebtSubmit(event) {
  event.preventDefault();
  if (!state.customers.length) {
    window.alert("Add a customer before adding debt.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const debtId = formData.get("debtId").toString();
  const payload = {
    customerId: formData.get("customerId").toString(),
    category: formData.get("category").toString(),
    currency: sanitizeCurrency(formData.get("currency").toString()),
    amount: toMoney(formData.get("amount")),
    debtDate: formData.get("debtDate").toString(),
    note: formData.get("note").toString().trim(),
  };

  if (debtId) {
    const confirmed = window.confirm(
      "Confirm updating this debt record? The saved debt data will be changed."
    );
    if (!confirmed) {
      return;
    }

    const debt = state.debts.find((entry) => entry.id === debtId);
    if (!debt) {
      return;
    }
    Object.assign(debt, payload);
  } else {
    state.debts.unshift({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }

  persistState();
  resetDebtForm();
  renderAll();
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  if (!state.customers.length) {
    window.alert("Add a customer before recording a payment.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const paymentId = formData.get("paymentId").toString();
  const payload = {
    customerId: formData.get("customerId").toString(),
    currency: sanitizeCurrency(formData.get("currency").toString()),
    amount: toMoney(formData.get("amount")),
    paymentDate: formData.get("paymentDate").toString(),
    mode: formData.get("mode").toString(),
    note: formData.get("note").toString().trim(),
  };

  if (paymentId) {
    const confirmed = window.confirm(
      "Confirm updating this payment? The saved payment data will be changed."
    );
    if (!confirmed) {
      return;
    }

    const payment = state.payments.find((entry) => entry.id === paymentId);
    if (!payment) {
      return;
    }
    Object.assign(payment, payload);
  } else {
    state.payments.unshift({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }

  persistState();
  resetPaymentForm();
  renderAll();
}

function handleDebtSearch() {
  renderSelectOptions();
  renderDebts();
}

function handlePaymentSearch() {
  renderSelectOptions();
  renderPayments();
}

function handleInvoiceSearch() {
  renderSelectOptions();
  syncInvoiceSelection();
  renderInvoicePreview();
}

function handleInvoiceCustomerChange() {
  activeInvoiceCustomerId = refs.invoiceCustomer?.value ?? "";
  renderInvoicePreview();
}

function handlePrintInvoice() {
  if (!activeInvoiceCustomerId || !getCustomer(activeInvoiceCustomerId)) {
    window.alert("Select a customer first.");
    return;
  }

  window.print();
}

function renderAll() {
  renderSelectOptions();
  syncInvoiceSelection();
  renderSummary();
  renderDashboardDebts();
  renderCustomers();
  renderDebts();
  renderPayments();
  renderInvoicePreview();
}

function renderSelectOptions() {
  renderCustomerSelect(refs.debtCustomer, getPickerCustomers(refs.debtSearch?.value));
  renderCustomerSelect(refs.paymentCustomer, getPickerCustomers(refs.paymentSearch?.value));
  renderCustomerSelect(
    refs.invoiceCustomer,
    getInvoiceEligibleCustomers(refs.invoiceSearch?.value),
    "No customers with current debt"
  );
}

function renderCustomerSelect(select, customers, emptyLabel = "No matching customers") {
  if (!select) {
    return;
  }

  const previousValue = select.value;
  const optionMarkup = customers.length
    ? customers
        .map(
          (customer) =>
            `<option value="${customer.id}">${escapeHtml(customer.fullName)} - ${escapeHtml(customer.phone)}</option>`
        )
        .join("")
    : `<option value="">${emptyLabel}</option>`;

  select.innerHTML = optionMarkup;
  if (customers.some((customer) => customer.id === previousValue)) {
    select.value = previousValue;
  } else if (customers[0]) {
    select.value = customers[0].id;
  }

  select.disabled = !customers.length;
}

function renderSummary() {
  if (!refs.customerCount || !refs.usdOutstanding || !refs.iqdOutstanding || !refs.invoiceCount) {
    return;
  }

  const totals = getOutstandingTotals();
  refs.customerCount.textContent = getActiveCustomers().length.toString();
  refs.usdOutstanding.textContent = formatMoney(totals.USD, "USD");
  refs.iqdOutstanding.textContent = formatMoney(totals.IQD, "IQD");
  refs.invoiceCount.textContent = getCustomersInDebtCount().toString();
}

function renderDashboardDebts() {
  if (!refs.dashboardDebtTableBody) {
    return;
  }

  const query = refs.dashboardDebtSearch?.value.trim().toLowerCase() ?? "";
  const activeCustomers = getActiveCustomers().filter((customer) =>
    matchesCustomerQuery(customer, query)
  );

  if (!activeCustomers.length) {
    refs.dashboardDebtTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">${
          query ? "No customers match this search." : "No customer debt data yet."
        }</td>
      </tr>
    `;
    return;
  }

  const rows = activeCustomers
    .map((customer) => {
      const balances = getCustomerBalances(customer.id);

      return {
        customer,
        balances,
      };
    })
    .sort((left, right) => {
      const rightTotal = right.balances.USD + right.balances.IQD;
      const leftTotal = left.balances.USD + left.balances.IQD;
      return rightTotal - leftTotal;
    });

  refs.dashboardDebtTableBody.innerHTML = rows
    .map(
      ({ customer, balances }) => `
        <tr>
          <td>
            <strong>${escapeHtml(customer.fullName)}</strong><br />
            <span class="meta-label">${escapeHtml(customer.address)}</span>
          </td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${formatMoney(balances.USD, "USD")}</td>
          <td>${formatMoney(balances.IQD, "IQD")}</td>
        </tr>
      `
    )
    .join("");
}

function renderCustomers() {
  if (!refs.customerTableBody || !refs.customerSearch) {
    return;
  }

  const query = refs.customerSearch.value.trim().toLowerCase();
  const filteredCustomers = getFilteredCustomers(query);

  if (!filteredCustomers.length) {
    refs.customerTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">${
          query ? "No customers match your search." : "No customers added yet."
        }</td>
      </tr>
    `;
    return;
  }

  refs.customerTableBody.innerHTML = filteredCustomers
    .map((customer) => {
      const balances = getCustomerBalances(customer.id);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(customer.fullName)}</strong><br />
            <span class="meta-label">${escapeHtml(customer.address)}</span>
          </td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${escapeHtml(customer.referenceName)}</td>
          <td>${formatMoney(balances.USD, "USD")}</td>
          <td>${formatMoney(balances.IQD, "IQD")}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="action-btn" data-edit-customer="${customer.id}">
                Edit
              </button>
              <button type="button" class="action-btn destructive-btn" data-delete-customer="${customer.id}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  refs.customerTableBody.querySelectorAll("[data-edit-customer]").forEach((button) => {
    button.addEventListener("click", () => startCustomerEdit(button.dataset.editCustomer));
  });
  refs.customerTableBody.querySelectorAll("[data-delete-customer]").forEach((button) => {
    button.addEventListener("click", () => confirmDeleteCustomer(button.dataset.deleteCustomer));
  });
}

function renderDebts() {
  if (!refs.debtList) {
    return;
  }

  const query = refs.debtSearch?.value.trim().toLowerCase() ?? "";
  const filteredDebts = [...getActiveDebts()]
    .sort((left, right) => right.debtDate.localeCompare(left.debtDate))
    .filter((debt) => matchesDebtQuery(debt, query));

  if (!filteredDebts.length) {
    refs.debtList.innerHTML = `<div class="empty-state">${
      query ? "No debt records match this customer search." : "No debt records yet."
    }</div>`;
    return;
  }

  refs.debtList.replaceChildren(
    ...filteredDebts.map((debt) => {
      const customer = getCustomer(debt.customerId);
      return buildActivityItem({
        title: `${capitalize(debt.category)} for ${customer?.fullName ?? "Unknown customer"}`,
        meta: `${formatDate(debt.debtDate)} - ${debt.currency}`,
        note: debt.note || "No note added.",
        amount: formatMoney(debt.amount, debt.currency),
        variant: "debt",
        actions: [
          {
            label: "Edit",
            onClick: () => startDebtEdit(debt.id),
          },
          {
            label: "Delete",
            destructive: true,
            onClick: () => confirmDeleteDebt(debt.id),
          },
        ],
      });
    })
  );
}

function renderPayments() {
  if (!refs.paymentList) {
    return;
  }

  const query = refs.paymentSearch?.value.trim().toLowerCase() ?? "";
  const filteredPayments = [...getActivePayments()]
    .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate))
    .filter((payment) => matchesPaymentQuery(payment, query));

  if (!filteredPayments.length) {
    refs.paymentList.innerHTML = `<div class="empty-state">${
      query ? "No payment records match this customer search." : "No payment records yet."
    }</div>`;
    return;
  }

  refs.paymentList.replaceChildren(
    ...filteredPayments.map((payment) => {
      const customer = getCustomer(payment.customerId);
      return buildActivityItem({
        title: `${customer?.fullName ?? "Unknown customer"} paid by ${payment.mode}`,
        meta: `${formatDate(payment.paymentDate)} - ${payment.currency}`,
        note: payment.note || "No note added.",
        amount: formatMoney(payment.amount, payment.currency),
        variant: "payment",
        actions: [
          {
            label: "Edit",
            onClick: () => startPaymentEdit(payment.id),
          },
          {
            label: "Delete",
            destructive: true,
            onClick: () => confirmDeletePayment(payment.id),
          },
        ],
      });
    })
  );
}

function renderInvoicePreview() {
  if (!refs.invoicePreview) {
    return;
  }

  const invoice = createLiveInvoice(activeInvoiceCustomerId);
  if (!invoice) {
    refs.invoicePreview.innerHTML = `
      <div class="invoice-placeholder">
        Search for a customer and choose one to preview the invoice automatically.
      </div>
    `;
    return;
  }

  refs.invoicePreview.innerHTML = `
    <div class="invoice-document modern-invoice">
      <div class="invoice-header">
        <div class="invoice-title">
          <div class="invoice-brand">
            <img
              src="harzan-travel-logo.png"
              alt="HARZAN TRAVEL logo"
              class="invoice-logo"
            />
            <div>
              <p>HARZAN TRAVEL</p>
              <h2>Travel Account Statement</h2>
            </div>
          </div>
          <p class="invoice-kicker">${escapeHtml(invoice.invoiceNumber)}</p>
        </div>
        <div class="invoice-meta-panel">
          <div>
            <p class="invoice-meta-label">Issue Date</p>
            <p class="invoice-meta-value">${formatDate(invoice.generatedAt)}</p>
          </div>
          <div>
            <p class="invoice-meta-label">Customer Phone</p>
            <p class="invoice-meta-value">${escapeHtml(invoice.customer.phone)}</p>
          </div>
          <div>
            <p class="invoice-meta-label">Address</p>
            <p class="invoice-meta-value">${escapeHtml(invoice.customer.address)}</p>
          </div>
        </div>
      </div>

      <div class="invoice-body">
        <div class="invoice-banner">
          <div class="invoice-card customer-card">
            <p class="invoice-stat-label">Customer Name</p>
            <strong>${escapeHtml(invoice.customer.fullName)}</strong>
          </div>
          <div class="invoice-stat debt-stat">
            <p class="invoice-stat-label">Total Debt USD</p>
            <strong>${formatMoney(invoice.totals.debtUsd, "USD")}</strong>
          </div>
          <div class="invoice-stat debt-stat">
            <p class="invoice-stat-label">Total Debt IQD</p>
            <strong>${formatMoney(invoice.totals.debtIqd, "IQD")}</strong>
          </div>
          <div class="invoice-stat payment-stat">
            <p class="invoice-stat-label">Total Paid USD</p>
            <strong>${formatMoney(invoice.totals.paidUsd, "USD")}</strong>
          </div>
          <div class="invoice-stat payment-stat">
            <p class="invoice-stat-label">Total Paid IQD</p>
            <strong>${formatMoney(invoice.totals.paidIqd, "IQD")}</strong>
          </div>
        </div>

        <div class="invoice-section debt-section">
          <div class="invoice-section-head">
            <div>
              <p>Debt Ledger</p>
              <h4>Outstanding services</h4>
            </div>
          </div>
          <table class="invoice-lines">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Note</th>
                <th>Currency</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                invoice.debts.length
                  ? invoice.debts
                      .map(
                        (debt) => `
                          <tr>
                            <td>${formatDate(debt.debtDate)}</td>
                            <td>${capitalize(debt.category)}</td>
                            <td>${escapeHtml(debt.note || "-")}</td>
                            <td>${debt.currency}</td>
                            <td class="amount-debt">${formatMoney(debt.amount, debt.currency)}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `
                    <tr>
                      <td colspan="5">No debt lines for this customer.</td>
                    </tr>
                  `
              }
            </tbody>
          </table>
        </div>

        <div class="invoice-section payment-section">
          <div class="invoice-section-head">
            <div>
              <p>Payment Ledger</p>
              <h4>Collected payments</h4>
            </div>
          </div>
          <table class="invoice-lines">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Note</th>
                <th>Currency</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                invoice.payments.length
                  ? invoice.payments
                      .map(
                        (payment) => `
                          <tr>
                            <td>${formatDate(payment.paymentDate)}</td>
                            <td>${escapeHtml(payment.mode)}</td>
                            <td>${escapeHtml(payment.note || "-")}</td>
                            <td>${payment.currency}</td>
                            <td class="amount-payment">${formatMoney(payment.amount, payment.currency)}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `
                    <tr>
                      <td colspan="5">No payments recorded for this customer.</td>
                    </tr>
                  `
              }
            </tbody>
          </table>
        </div>

        <div class="invoice-totals">
          <div class="invoice-total-card debt-total">
            <p class="invoice-stat-label">Net Due USD</p>
            <strong>${formatMoney(invoice.totals.netUsd, "USD")}</strong>
          </div>
          <div class="invoice-total-card debt-total">
            <p class="invoice-stat-label">Net Due IQD</p>
            <strong>${formatMoney(invoice.totals.netIqd, "IQD")}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createLiveInvoice(customerId) {
  if (!customerId) {
    return null;
  }

  const customer = getCustomer(customerId);
  if (!customer) {
    return null;
  }

  const debts = [...getActiveDebts()]
    .filter((debt) => debt.customerId === customerId)
    .sort((left, right) => right.debtDate.localeCompare(left.debtDate));
  const payments = [...getActivePayments()]
    .filter((payment) => payment.customerId === customerId)
    .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate));
  const balances = getCustomerBalances(customerId);
  const debtTotals = sumEntries(debts);
  const paymentTotals = sumEntries(payments);

  return {
    invoiceNumber: buildInvoiceNumber(customer.fullName),
    generatedAt: new Date().toISOString(),
    customer,
    debts,
    payments,
    totals: {
      debtUsd: debtTotals.USD,
      debtIqd: debtTotals.IQD,
      paidUsd: paymentTotals.USD,
      paidIqd: paymentTotals.IQD,
      netUsd: balances.USD,
      netIqd: balances.IQD,
    },
  };
}

function buildInvoiceNumber(fullName) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return `INV-${datePart}-${initials || "HT"}`;
}

function getCustomerBalances(customerId) {
  const debts = getActiveDebts().filter((entry) => entry.customerId === customerId);
  const payments = getActivePayments().filter((entry) => entry.customerId === customerId);
  const debtTotals = sumEntries(debts);
  const paymentTotals = sumEntries(payments);

  return {
    USD: debtTotals.USD - paymentTotals.USD,
    IQD: debtTotals.IQD - paymentTotals.IQD,
  };
}

function getOutstandingTotals() {
  return state.customers.reduce(
    (accumulator, customer) => {
      const balances = getCustomerBalances(customer.id);
      accumulator.USD += balances.USD;
      accumulator.IQD += balances.IQD;
      return accumulator;
    },
    { USD: 0, IQD: 0 }
  );
}

function getCustomersInDebtCount() {
  return getActiveCustomers().filter((customer) => {
    return hasCurrentDebt(customer.id);
  }).length;
}

function sumEntries(entries) {
  return entries.reduce(
    (accumulator, entry) => {
      accumulator[entry.currency] += entry.amount;
      return accumulator;
    },
    { USD: 0, IQD: 0 }
  );
}

function buildActivityItem({ title, meta, note, amount, variant, actions = [] }) {
  if (!refs.activityTemplate) {
    throw new Error("Activity template is missing on this page.");
  }

  const fragment = refs.activityTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".activity-item");
  const amountNode = item.querySelector(".amount");
  const side = document.createElement("div");
  side.className = "activity-side";
  amountNode.replaceWith(side);
  side.append(amountNode);

  item.querySelector("h4").textContent = title;
  item.querySelector(".meta").textContent = meta;
  item.querySelector(".note").textContent = note;
  item.querySelector(".amount").textContent = amount;
  if (variant) {
    item.classList.add(`${variant}-item`);
  }

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.destructive ? "action-btn destructive-btn" : "action-btn";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    side.append(button);
  });

  return item;
}

function startCustomerEdit(customerId) {
  const customer = getCustomer(customerId);
  if (!customer || !refs.customerForm) {
    return;
  }

  refs.customerForm.elements.namedItem("customerId").value = customer.id;
  refs.customerForm.elements.namedItem("fullName").value = customer.fullName;
  refs.customerForm.elements.namedItem("phone").value = customer.phone;
  refs.customerForm.elements.namedItem("referenceName").value = customer.referenceName;
  refs.customerForm.elements.namedItem("address").value = customer.address;

  if (refs.customerFormTitle) {
    refs.customerFormTitle.textContent = "Edit customer";
  }
  if (refs.customerSubmitBtn) {
    refs.customerSubmitBtn.textContent = "Update Customer";
  }
  refs.customerCancelEdit?.classList.remove("is-hidden");
  refs.customerForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startDebtEdit(debtId) {
  const debt = state.debts.find((entry) => entry.id === debtId);
  if (!debt || !refs.debtForm) {
    return;
  }

  const customer = getCustomer(debt.customerId);
  if (refs.debtSearch && customer) {
    refs.debtSearch.value = `${customer.fullName} ${customer.phone}`;
    renderSelectOptions();
  }

  refs.debtForm.elements.namedItem("debtId").value = debt.id;
  refs.debtForm.elements.namedItem("customerId").value = debt.customerId;
  refs.debtForm.elements.namedItem("category").value = debt.category;
  refs.debtForm.elements.namedItem("currency").value = debt.currency;
  refs.debtForm.elements.namedItem("amount").value = String(debt.amount);
  refs.debtForm.elements.namedItem("debtDate").value = debt.debtDate;
  refs.debtForm.elements.namedItem("note").value = debt.note;

  if (refs.debtFormTitle) {
    refs.debtFormTitle.textContent = "Edit debt record";
  }
  if (refs.debtSubmitBtn) {
    refs.debtSubmitBtn.textContent = "Update Debt";
  }
  refs.debtCancelEdit?.classList.remove("is-hidden");
  refs.debtForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startPaymentEdit(paymentId) {
  const payment = state.payments.find((entry) => entry.id === paymentId);
  if (!payment || !refs.paymentForm) {
    return;
  }

  const customer = getCustomer(payment.customerId);
  if (refs.paymentSearch && customer) {
    refs.paymentSearch.value = `${customer.fullName} ${customer.phone}`;
    renderSelectOptions();
  }

  refs.paymentForm.elements.namedItem("paymentId").value = payment.id;
  refs.paymentForm.elements.namedItem("customerId").value = payment.customerId;
  refs.paymentForm.elements.namedItem("currency").value = payment.currency;
  refs.paymentForm.elements.namedItem("amount").value = String(payment.amount);
  refs.paymentForm.elements.namedItem("paymentDate").value = payment.paymentDate;
  refs.paymentForm.elements.namedItem("mode").value = payment.mode;
  refs.paymentForm.elements.namedItem("note").value = payment.note;

  if (refs.paymentFormTitle) {
    refs.paymentFormTitle.textContent = "Edit payment";
  }
  if (refs.paymentSubmitBtn) {
    refs.paymentSubmitBtn.textContent = "Update Payment";
  }
  refs.paymentCancelEdit?.classList.remove("is-hidden");
  refs.paymentForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetCustomerForm() {
  if (!refs.customerForm) {
    return;
  }

  refs.customerForm.reset();
  refs.customerForm.elements.namedItem("customerId").value = "";
  if (refs.customerFormTitle) {
    refs.customerFormTitle.textContent = "Add a customer";
  }
  if (refs.customerSubmitBtn) {
    refs.customerSubmitBtn.textContent = "Save Customer";
  }
  refs.customerCancelEdit?.classList.add("is-hidden");
}

function resetDebtForm() {
  if (!refs.debtForm) {
    return;
  }

  refs.debtForm.reset();
  refs.debtForm.elements.namedItem("debtId").value = "";
  if (refs.debtFormTitle) {
    refs.debtFormTitle.textContent = "Add debt record";
  }
  if (refs.debtSubmitBtn) {
    refs.debtSubmitBtn.textContent = "Add Debt";
  }
  refs.debtCancelEdit?.classList.add("is-hidden");
  setDefaultDates();
  renderSelectOptions();
}

function resetPaymentForm() {
  if (!refs.paymentForm) {
    return;
  }

  refs.paymentForm.reset();
  refs.paymentForm.elements.namedItem("paymentId").value = "";
  if (refs.paymentFormTitle) {
    refs.paymentFormTitle.textContent = "Record payment";
  }
  if (refs.paymentSubmitBtn) {
    refs.paymentSubmitBtn.textContent = "Record Payment";
  }
  refs.paymentCancelEdit?.classList.add("is-hidden");
  setDefaultDates();
  renderSelectOptions();
}

function confirmDeleteCustomer(customerId) {
  const customer = getCustomer(customerId);
  if (!customer) {
    return;
  }

  const confirmed = window.confirm(
    `Delete ${customer.fullName}? This customer and their debts/payments will stay recoverable for 14 days before permanent deletion.`
  );
  if (!confirmed) {
    return;
  }

  softDeleteCustomer(customerId);
  persistState();
  resetCustomerForm();
  resetDebtForm();
  resetPaymentForm();
  if (activeInvoiceCustomerId === customerId) {
    activeInvoiceCustomerId = "";
  }
  renderAll();
}

function confirmDeleteDebt(debtId) {
  const confirmed = window.confirm(
    "Delete this debt record? It will stay recoverable for 14 days before permanent deletion."
  );
  if (!confirmed) {
    return;
  }

  softDeleteRecord(state.debts.find((entry) => entry.id === debtId));
  persistState();
  resetDebtForm();
  renderAll();
}

function confirmDeletePayment(paymentId) {
  const confirmed = window.confirm(
    "Delete this payment record? It will stay recoverable for 14 days before permanent deletion."
  );
  if (!confirmed) {
    return;
  }

  softDeleteRecord(state.payments.find((entry) => entry.id === paymentId));
  persistState();
  resetPaymentForm();
  renderAll();
}

function softDeleteCustomer(customerId) {
  const customer = state.customers.find((entry) => entry.id === customerId);
  softDeleteRecord(customer);
  state.debts
    .filter((debt) => debt.customerId === customerId && !debt.deletedAt)
    .forEach((debt) => softDeleteRecord(debt));
  state.payments
    .filter((payment) => payment.customerId === customerId && !payment.deletedAt)
    .forEach((payment) => softDeleteRecord(payment));
}

function softDeleteRecord(record) {
  if (!record || record.deletedAt) {
    return;
  }
  record.deletedAt = new Date().toISOString();
}

function getCustomer(customerId) {
  return getActiveCustomers().find((customer) => customer.id === customerId);
}

function getFilteredCustomers(query) {
  return getActiveCustomers().filter((customer) => matchesCustomerQuery(customer, query));
}

function getPickerCustomers(query) {
  return getFilteredCustomers((query ?? "").trim().toLowerCase());
}

function getInvoiceEligibleCustomers(query) {
  return getPickerCustomers(query).filter((customer) => hasCurrentDebt(customer.id));
}

function matchesCustomerQuery(customer, query) {
  if (!query) {
    return true;
  }

  const relatedNotes = [
    ...getActiveDebts()
      .filter((debt) => debt.customerId === customer.id)
      .map((debt) => debt.note || ""),
    ...getActivePayments()
      .filter((payment) => payment.customerId === customer.id)
      .map((payment) => payment.note || ""),
  ].join(" ");

  const haystack = [
    customer.fullName,
    customer.phone,
    customer.referenceName,
    customer.address,
    relatedNotes,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesDebtQuery(debt, query) {
  if (!query) {
    return true;
  }

  const customer = getCustomer(debt.customerId);
  return [
    customer?.fullName ?? "",
    customer?.phone ?? "",
    customer?.referenceName ?? "",
    debt.category,
    debt.note,
    debt.debtDate,
    debt.currency,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function matchesPaymentQuery(payment, query) {
  if (!query) {
    return true;
  }

  const customer = getCustomer(payment.customerId);
  return [
    customer?.fullName ?? "",
    customer?.phone ?? "",
    customer?.referenceName ?? "",
    payment.mode,
    payment.note,
    payment.paymentDate,
    payment.currency,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sanitizeCurrency(currency) {
  return currency === "IQD" ? "IQD" : "USD";
}

function toMoney(value) {
  const amount = Number.parseFloat(value.toString());
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function formatMoney(amount, currency) {
  if (currency === "IQD") {
    return `IQD ${Math.round(amount).toLocaleString("en-US")}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  const paymentDateInput = refs.paymentForm?.elements.namedItem("paymentDate");
  const debtDateInput = refs.debtForm?.elements.namedItem("debtDate");
  if (paymentDateInput && !paymentDateInput.value) {
    paymentDateInput.value = today;
  }
  if (debtDateInput && !debtDateInput.value) {
    debtDateInput.value = today;
  }
}

function syncInvoiceSelection() {
  if (!refs.invoiceCustomer) {
    return;
  }

  const availableCustomers = getInvoiceEligibleCustomers(refs.invoiceSearch?.value);
  if (!availableCustomers.length) {
    activeInvoiceCustomerId = "";
    return;
  }

  if (!availableCustomers.some((customer) => customer.id === activeInvoiceCustomerId)) {
    activeInvoiceCustomerId = refs.invoiceCustomer.value || availableCustomers[0].id;
  }

  refs.invoiceCustomer.value = activeInvoiceCustomerId;
}

function normalizeLegacyData() {
  purgeExpiredDeletedRecords();

  state.debts = state.debts.map((debt) => ({
    ...debt,
    debtDate: debt.debtDate || new Date(debt.createdAt || Date.now()).toISOString().slice(0, 10),
  }));
  state.payments = state.payments.map((payment) => ({
    ...payment,
    paymentDate:
      payment.paymentDate || new Date(payment.createdAt || Date.now()).toISOString().slice(0, 10),
  }));
}

function purgeExpiredDeletedRecords() {
  const cutoff = Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  state.customers = state.customers.filter((customer) => !isExpiredDeleted(customer, cutoff));
  state.debts = state.debts.filter((debt) => !isExpiredDeleted(debt, cutoff));
  state.payments = state.payments.filter((payment) => !isExpiredDeleted(payment, cutoff));
}

function isExpiredDeleted(record, cutoff) {
  if (!record?.deletedAt) {
    return false;
  }
  return new Date(record.deletedAt).getTime() <= cutoff;
}

function getActiveCustomers() {
  return state.customers.filter((customer) => !customer.deletedAt);
}

function getActiveDebts() {
  return state.debts.filter((debt) => !debt.deletedAt);
}

function getActivePayments() {
  return state.payments.filter((payment) => !payment.deletedAt);
}

function hasCurrentDebt(customerId) {
  const balances = getCustomerBalances(customerId);
  return balances.USD > 0 || balances.IQD > 0;
}

function isDuplicateCustomer(payload, ignoreCustomerId = "") {
  const normalizedPayload = normalizeCustomerPayload(payload);
  return getActiveCustomers().some((customer) => {
    if (customer.id === ignoreCustomerId) {
      return false;
    }

    const normalizedCustomer = normalizeCustomerPayload(customer);
    return (
      normalizedCustomer.fullName === normalizedPayload.fullName &&
      normalizedCustomer.phone === normalizedPayload.phone &&
      normalizedCustomer.referenceName === normalizedPayload.referenceName &&
      normalizedCustomer.address === normalizedPayload.address
    );
  });
}

function normalizeCustomerPayload(customer) {
  return {
    fullName: normalizeString(customer.fullName),
    phone: normalizeString(customer.phone),
    referenceName: normalizeString(customer.referenceName),
    address: normalizeString(customer.address),
  };
}

function normalizeString(value) {
  return value.toString().trim().replace(/\s+/g, " ").toLowerCase();
}

function highlightCurrentPage() {
  document.querySelectorAll(".section-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    const isActive =
      (currentPage === "dashboard" && href === "index.html") ||
      (currentPage === "customers" && href === "customers.html") ||
      (currentPage === "debts" && href === "debts.html") ||
      (currentPage === "payments" && href === "payments.html") ||
      (currentPage === "invoices" && href === "invoices.html");

    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function toggleSettingsPanel() {
  refs.settingsPanel?.classList.toggle("is-hidden");
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return savedTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  refs.themeChoices.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeValue === theme);
  });
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const fallback = {
    customers: [],
    debts: [],
    payments: [],
    invoices: [],
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved);
    return {
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    };
  } catch (error) {
    console.error("Failed to load saved data", error);
    return fallback;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
