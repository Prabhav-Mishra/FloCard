"use strict";

const PAGE_SIZE = 12;

const state = {
  records: [],
  activeTab: "participants",
  page: 1,
  search: "",
  recipientSearch: "",
  recipientMode: "all",
  selectedIds: new Set(),
  pendingRecipientIds: [],
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindEvents();
  updateCharacterCount();
  state.records = await loadParticipants();
  renderAll();
});

function cacheElements() {
  [
    "participantsTab", "preRegisteredTab", "participantCount", "preRegisteredCount",
    "openNotificationButton", "participantSearch", "lastSendSummary", "tableHead",
    "participantTableBody", "emptyState", "tableResultSummary", "previousPage",
    "nextPage", "pageIndicator", "notificationModal", "recipientSelector",
    "recipientModeCount", "recipientSearch", "recipientOptions", "selectedChips",
    "selectedCount", "selectorResultCount", "selectVisibleButton", "clearSelectionButton",
    "emailSubject", "messageEditor", "characterCount", "modalStatus", "previewButton",
    "prepareSendButton", "confirmationModal", "confirmationCount", "confirmationMode",
    "confirmationSubject", "confirmSendButton", "resultModal", "resultIcon", "resultTitle",
    "resultMessage", "resultCount", "resultOkayButton", "previewModal", "previewSubject",
    "previewBody", "toastRegion", "textColor", "formatBlock", "insertLinkButton",
    "insertImageButton", "editorImageInput",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  elements.participantSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    state.page = 1;
    renderTable();
  });

  elements.previousPage.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderTable();
  });

  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    renderTable();
  });

  elements.openNotificationButton.addEventListener("click", openNotificationModal);

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  document.querySelectorAll('input[name="recipientMode"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.recipientMode = event.target.value;
      elements.recipientSelector.classList.toggle("is-hidden", state.recipientMode !== "selected");
      elements.modalStatus.textContent = "";
      updateRecipientCounts();
      if (state.recipientMode === "selected") {
        renderRecipientSelector();
        window.setTimeout(() => elements.recipientSearch.focus(), 80);
      }
    });
  });

  elements.recipientSearch.addEventListener("input", (event) => {
    state.recipientSearch = event.target.value.trim().toLowerCase();
    renderRecipientOptions();
  });

  elements.selectVisibleButton.addEventListener("click", () => {
    getVisibleRecipientOptions().forEach((participant) => state.selectedIds.add(participant.id));
    renderRecipientSelector();
  });

  elements.clearSelectionButton.addEventListener("click", () => {
    state.selectedIds.clear();
    renderRecipientSelector();
  });

  elements.selectedChips.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-remove-id]");
    if (!button) return;
    state.selectedIds.delete(button.dataset.removeId);
    renderRecipientSelector();
  });

  elements.recipientOptions.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"][data-participant-id]');
    if (!checkbox) return;
    if (checkbox.checked) state.selectedIds.add(checkbox.dataset.participantId);
    else state.selectedIds.delete(checkbox.dataset.participantId);
    renderSelectedChips();
    updateRecipientCounts();
  });

  document.querySelectorAll(".editor-toolbar [data-command]").forEach((button) => {
    button.addEventListener("click", () => runEditorCommand(button.dataset.command));
  });

  elements.textColor.addEventListener("input", (event) => runEditorCommand("foreColor", event.target.value));
  elements.formatBlock.addEventListener("change", (event) => runEditorCommand("formatBlock", event.target.value));
  elements.insertLinkButton.addEventListener("click", insertLink);
  elements.insertImageButton.addEventListener("click", () => elements.editorImageInput.click());
  elements.editorImageInput.addEventListener("change", insertImage);
  elements.messageEditor.addEventListener("input", updateCharacterCount);

  elements.previewButton.addEventListener("click", showPreview);
  elements.prepareSendButton.addEventListener("click", prepareSend);
  elements.confirmSendButton.addEventListener("click", performMockSend);
  elements.resultOkayButton.addEventListener("click", finishResultFlow);

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("mousedown", (event) => {
      if (event.target === backdrop && backdrop.id !== "resultModal") closeModal(backdrop.id);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openModals = [...document.querySelectorAll(".modal-backdrop:not(.is-hidden)")];
    const top = openModals.at(-1);
    if (top && top.id !== "resultModal") closeModal(top.id);
  });
}

async function loadParticipants() {
  try {
    const response = await fetch("participants.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 100) throw new Error("Sample participant data is incomplete.");
    return data;
  } catch (error) {
    console.info("Using embedded fallback sample data. Serve the folder locally to load participants.json.", error);
    showToast("Direct-file mode: using the built-in sample participant list.");
    return buildFallbackData();
  }
}

function buildFallbackData() {
  const firstNames = ["Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Ananya", "Karan", "Neha", "Arjun", "Meera", "Kabir", "Ishita"];
  const lastNames = ["Sharma", "Mehta", "Kapoor", "Iyer", "Singh", "Das", "Malhotra", "Kulkarni", "Nair", "Rao"];
  return Array.from({ length: 120 }, (_, index) => {
    const number = index + 1;
    return {
      id: `ATT-${String(number).padStart(4, "0")}`,
      type: number <= 100 ? "Participant" : "Pre-Registered Participant",
      name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`,
      email: `participant${String(number).padStart(3, "0")}@example${(index % 9) + 1}.com`,
      phone: `+91 ${String(8700000000 + number)}`,
      gender: ["Male", "Female", "Other", "Prefer not to say"][index % 4],
      status: index % 3 === 0 ? "Not Attended" : "Attended",
      remarks: index % 11 === 0 ? "Invitee" : index % 7 === 0 ? "Spot Entry" : "—",
      notified: index % 5 === 0,
      notificationCount: index % 5 === 0 ? 1 : 0,
      lastNotifiedAt: index % 5 === 0 ? "2026-01-20T10:30:00Z" : null,
    };
  });
}

function renderAll() {
  const participants = getParticipants();
  const preRegistered = getPreRegistered();
  elements.participantCount.textContent = participants.length;
  elements.preRegisteredCount.textContent = preRegistered.length;
  updateRecipientCounts();
  renderTable();
}

function switchTab(tabName) {
  state.activeTab = tabName;
  state.page = 1;
  state.search = "";
  elements.participantSearch.value = "";
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  const participantsActive = tabName === "participants";
  elements.openNotificationButton.classList.toggle("is-hidden", !participantsActive);
  elements.lastSendSummary.classList.toggle("is-hidden", !participantsActive || !elements.lastSendSummary.textContent);
  elements.participantSearch.placeholder = participantsActive
    ? "Search by name, email or phone..."
    : "Search pre-registered participants...";
  renderTable();
}

function getParticipants() {
  return state.records.filter((record) => record.type === "Participant");
}

function getPreRegistered() {
  return state.records.filter((record) => record.type === "Pre-Registered Participant");
}

function getActiveRecords() {
  return state.activeTab === "participants" ? getParticipants() : getPreRegistered();
}

function getFilteredActiveRecords() {
  if (!state.search) return getActiveRecords();
  return getActiveRecords().filter((record) =>
    [record.name, record.email, record.phone, record.status, record.gender]
      .some((value) => String(value || "").toLowerCase().includes(state.search)),
  );
}

function renderTable() {
  const participantsActive = state.activeTab === "participants";
  elements.tableHead.innerHTML = participantsActive
    ? `<tr><th>SL.</th><th>NAME</th><th>EMAIL</th><th>PHONE</th><th>GENDER</th><th>STATUS</th><th>REMARKS</th><th>NOTIFICATION</th></tr>`
    : `<tr><th>SL.</th><th>NAME</th><th>EMAIL</th><th>PHONE</th><th>STATUS</th><th>REMARKS</th></tr>`;

  const filtered = getFilteredActiveRecords();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRecords = filtered.slice(start, start + PAGE_SIZE);

  elements.participantTableBody.innerHTML = pageRecords.map((record, pageIndex) => {
    const statusClass = record.status === "Attended" ? "attended" : "not-attended";
    const notificationClass = record.notified ? "sent" : "not-sent";
    const notificationLabel = record.notified
      ? record.notificationCount > 1 ? `Sent ${record.notificationCount}×` : "Sent"
      : "Not Sent";
    const common = `
      <td>${start + pageIndex + 1}</td>
      <td title="${escapeHTML(record.name)}">${escapeHTML(record.name)}</td>
      <td title="${escapeHTML(maskEmail(record.email))}">${escapeHTML(maskEmail(record.email))}</td>
      <td>${escapeHTML(maskPhone(record.phone))}</td>`;
    if (!participantsActive) {
      return `<tr>${common}<td><span class="status-badge ${statusClass}">${record.status}</span></td><td>${escapeHTML(record.remarks || "—")}</td></tr>`;
    }
    return `<tr>${common}<td>${escapeHTML(record.gender)}</td><td><span class="status-badge ${statusClass}">${record.status}</span></td><td>${escapeHTML(record.remarks || "—")}</td><td><span class="status-badge ${notificationClass}" title="${record.lastNotifiedAt ? `Last sent ${formatDate(record.lastNotifiedAt)}` : "No notification sent"}">${notificationLabel}</span></td></tr>`;
  }).join("");

  elements.emptyState.classList.toggle("is-hidden", filtered.length !== 0);
  elements.tableResultSummary.textContent = filtered.length
    ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} ${participantsActive ? "participants" : "pre-registered participants"}`
    : "Showing 0 participants";
  elements.pageIndicator.textContent = `Page ${state.page} of ${totalPages}`;
  elements.previousPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;
}

function openNotificationModal() {
  state.recipientMode = "all";
  state.selectedIds.clear();
  state.recipientSearch = "";
  elements.recipientSearch.value = "";
  elements.modalStatus.textContent = "";
  document.querySelector('input[name="recipientMode"][value="all"]').checked = true;
  elements.recipientSelector.classList.add("is-hidden");
  updateRecipientCounts();
  openModal("notificationModal");
}

function openModal(id) {
  document.getElementById(id).classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id).classList.add("is-hidden");
  if (!document.querySelector(".modal-backdrop:not(.is-hidden)")) document.body.style.overflow = "";
}

function getVisibleRecipientOptions() {
  const participants = getParticipants();
  if (!state.recipientSearch) return participants;
  return participants.filter((record) =>
    record.name.toLowerCase().includes(state.recipientSearch)
    || record.email.toLowerCase().includes(state.recipientSearch),
  );
}

function renderRecipientSelector() {
  renderSelectedChips();
  renderRecipientOptions();
  updateRecipientCounts();
}

function renderSelectedChips() {
  const selected = getParticipants().filter((record) => state.selectedIds.has(record.id));
  elements.selectedChips.innerHTML = selected.length
    ? selected.map((record) => `
        <span class="recipient-chip">
          <span title="${escapeHTML(record.name)} — ${escapeHTML(maskEmail(record.email))}">${escapeHTML(record.name)} — ${escapeHTML(maskEmail(record.email))}</span>
          <button type="button" data-remove-id="${record.id}" aria-label="Remove ${escapeHTML(record.name)}">×</button>
        </span>`).join("")
    : `<span class="selection-placeholder">No participants selected</span>`;
}

function renderRecipientOptions() {
  const visible = getVisibleRecipientOptions();
  elements.selectorResultCount.textContent = `${visible.length} available`;
  elements.recipientOptions.innerHTML = visible.length
    ? visible.map((record) => `
        <label class="recipient-option">
          <input type="checkbox" data-participant-id="${record.id}" ${state.selectedIds.has(record.id) ? "checked" : ""}>
          <span>${escapeHTML(record.name)} — ${escapeHTML(maskEmail(record.email))}</span>
        </label>`).join("")
    : `<div class="empty-state">No matching participants.</div>`;
}

function updateRecipientCounts() {
  const count = state.recipientMode === "all" ? getParticipants().length : state.selectedIds.size;
  elements.recipientModeCount.textContent = `${count} ${count === 1 ? "recipient" : "recipients"}`;
  elements.selectedCount.textContent = `${state.selectedIds.size} ${state.selectedIds.size === 1 ? "participant" : "participants"} selected`;
}

function runEditorCommand(command, value = null) {
  elements.messageEditor.focus();
  document.execCommand(command, false, value);
  updateCharacterCount();
}

function insertLink() {
  const url = window.prompt("Enter the link URL", "https://");
  if (!url) return;
  runEditorCommand("createLink", url);
}

function insertImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setModalError("Unable to add the selected file. Please choose an image.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => runEditorCommand("insertImage", reader.result);
  reader.onerror = () => setModalError("Unable to read the selected image.");
  reader.readAsDataURL(file);
  event.target.value = "";
}

function updateCharacterCount() {
  const length = elements.messageEditor.innerText.trim().length;
  elements.characterCount.textContent = `${length.toLocaleString()} characters`;
}

function validateMessage() {
  const subject = elements.emailSubject.value.trim();
  const message = elements.messageEditor.innerText.trim();
  if (!subject) return "Please enter an email subject.";
  if (!message) return "Please enter the notification message.";
  if (state.recipientMode === "selected" && state.selectedIds.size === 0) {
    return "Please select at least one participant.";
  }
  return "";
}

function showPreview() {
  const error = validateMessage();
  if (error) {
    setModalError(error);
    return;
  }
  elements.modalStatus.textContent = "";
  elements.previewSubject.textContent = elements.emailSubject.value.trim();
  elements.previewBody.innerHTML = sanitizeEditorHTML(elements.messageEditor.innerHTML);
  openModal("previewModal");
}

function prepareSend() {
  const error = validateMessage();
  if (error) {
    setModalError(error);
    return;
  }
  state.pendingRecipientIds = state.recipientMode === "all"
    ? getParticipants().map((record) => record.id)
    : [...state.selectedIds];
  const count = state.pendingRecipientIds.length;
  elements.confirmationCount.textContent = `${count} ${count === 1 ? "participant" : "participants"}`;
  elements.confirmationMode.textContent = state.recipientMode === "all" ? "All Participants" : "Select from List";
  elements.confirmationSubject.textContent = elements.emailSubject.value.trim();
  elements.modalStatus.textContent = "";
  openModal("confirmationModal");
}

async function performMockSend() {
  elements.confirmSendButton.disabled = true;
  elements.confirmSendButton.textContent = "Sending…";
  await delay(850);

  const simulateFailure = new URLSearchParams(window.location.search).get("simulateError") === "1";
  if (simulateFailure) {
    closeModal("confirmationModal");
    showResult(false, 0, "Unable to send the notification. Please review the recipient details and try again.");
    resetConfirmButton();
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const selected = new Set(state.pendingRecipientIds);
    state.records.forEach((record) => {
      if (!selected.has(record.id)) return;
      record.notified = true;
      record.notificationCount = Number(record.notificationCount || 0) + 1;
      record.lastNotifiedAt = timestamp;
    });
    const count = state.pendingRecipientIds.length;
    closeModal("confirmationModal");
    closeModal("notificationModal");
    elements.lastSendSummary.textContent = `✓ Latest mock notification sent to ${count} ${count === 1 ? "participant" : "participants"}.`;
    elements.lastSendSummary.classList.remove("is-hidden");
    renderTable();
    showResult(true, count, `The email notification was successfully processed for ${count} ${count === 1 ? "participant" : "participants"}.`);
  } catch (error) {
    closeModal("confirmationModal");
    showResult(false, 0, "Unable to send the notification. Please try again.");
    console.error(error);
  } finally {
    resetConfirmButton();
  }
}

function resetConfirmButton() {
  elements.confirmSendButton.disabled = false;
  elements.confirmSendButton.textContent = "Confirm & Send";
}

function showResult(success, count, message) {
  elements.resultModal.querySelector(".result-modal").classList.toggle("error", !success);
  elements.resultIcon.textContent = success ? "✓" : "!";
  elements.resultTitle.textContent = success ? "Notification Sent" : "Unable to Send";
  elements.resultMessage.textContent = message;
  elements.resultCount.textContent = count;
  elements.resultCount.parentElement.classList.toggle("is-hidden", !success);
  openModal("resultModal");
}

function finishResultFlow() {
  closeModal("resultModal");
  state.selectedIds.clear();
  state.pendingRecipientIds = [];
  renderRecipientSelector();
}

function setModalError(message) {
  elements.modalStatus.textContent = message;
  showToast(message, true);
}

function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast${error ? " error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function sanitizeEditorHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, iframe, object, embed, form, input, button").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || (name === "href" && value.startsWith("javascript:"))) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

function maskEmail(email) {
  const [local, domain = ""] = String(email).split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(5, local.length - visible.length))}@${domain}`;
}

function maskPhone(phone) {
  const value = String(phone);
  const digits = value.replace(/\D/g, "");
  return `${value.trim().startsWith("+") ? "+" : ""}${"X".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
