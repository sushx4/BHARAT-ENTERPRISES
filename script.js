// ============================================
// BHARAT ENTERPRISE - VEHICLE DOCUMENT MANAGER
// SUPABASE DATABASE CONNECTION
// ============================================

const SUPABASE_URL = "https://xkqfvunxvbfdtlyvelmm.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_KY6fRxnRnn8IoBYri9b2Qg_TqKpbbLR";
const DOCUMENTS_BUCKET = "vehicle-documents";
const LISTED_VEHICLE_NUMBERS = ['AP28TC5534', 'AP23X3250', 'AP20TC0200', 'TS07UH2321', 'TS12UC5050', 'TS07UF8222', 'AP28TC9177', 'AP28TC9178', 'AP28TC9179', 'AP28TC9181', 'TS07UL0838', 'TS07UL1186', 'TS07UL8508', 'TS07UL8541', 'TS07UL2147', 'TS07UL2930', 'TS07UL2931', 'TS10UB0464', 'TS07UP1620', 'TS07UA0774', 'TS07UM6259', 'TS07UF0215', 'TG07V7172', 'TG07V7173', 'TG07V7174', 'TG07V8611', 'TG07V8612', 'TG07X0719', 'TS07UA7474', 'TS07UF8746', 'AP28Y4749', 'TS12UC4835', 'TG36T2875', 'TG07X9151', 'TG07X9152', 'TG07X9153', 'TG07X9226', 'TG07X9227'];
 // Create this as a PRIVATE bucket in Supabase Storage.
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let vehicles = [];
let currentUser = null;
let expiryFilter = "all";


// ============================================
// 1. LOGIN AND SIGNUP SCREEN
// ============================================

function setupLoginScreen() {
    const screen = document.createElement("div");
    screen.id = "loginScreen";

    screen.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #f4f7fb;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: Arial, sans-serif;
    `;

    screen.innerHTML = `
        <form id="loginForm" style="
            background: white;
            padding: 28px;
            border-radius: 14px;
            width: 100%;
            max-width: 390px;
            box-shadow: 0 5px 25px #0001;
        ">

            <h2 style="margin-bottom: 8px">
                Bharat Enterprise
            </h2>

            <p style="color: #6b7280; margin-bottom: 20px">
                Vehicle Document Manager
            </p>

            <label>Email</label>

            <input
                id="loginEmail"
                type="email"
                required
                style="
                    display: block;
                    width: 100%;
                    padding: 12px;
                    margin: 8px 0 15px;
                    box-sizing: border-box;
                "
            >

            <label>Password</label>

            <input
                id="loginPassword"
                type="password"
                minlength="6"
                required
                style="
                    display: block;
                    width: 100%;
                    padding: 12px;
                    margin: 8px 0 15px;
                    box-sizing: border-box;
                "
            >

            <button type="submit" style="
                width: 100%;
                padding: 12px;
                background: #2563eb;
                color: white;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
            ">
                Login
            </button>

            <button type="button" id="signupButton" style="
                width: 100%;
                padding: 12px;
                margin-top: 10px;
                border: 1px solid #ddd;
                border-radius: 8px;
                cursor: pointer;
            ">
                Create Account
            </button>

            <p id="loginMessage" style="
                margin-top: 15px;
                overflow-wrap: anywhere;
            "></p>

        </form>
    `;

    document.body.appendChild(screen);

    document.querySelectorAll(".sidebar, .main")
        .forEach(element => {
            element.style.display = "none";
        });


    // LOGIN
    document.getElementById("loginForm")
        .addEventListener("submit", async event => {

            event.preventDefault();

            const email = document
                .getElementById("loginEmail")
                .value.trim();

            const password = document
                .getElementById("loginPassword")
                .value;

            const message = document
                .getElementById("loginMessage");

            message.textContent = "Logging in...";

            try {
                const { error } = await db.auth
                    .signInWithPassword({
                        email,
                        password
                    });

                if (error) {
                    message.textContent = error.message;
                }

            } catch (error) {
                message.textContent = error.message;
            }
        });


    // SIGNUP
    document.getElementById("signupButton")
        .addEventListener("click", async () => {

            const email = document
                .getElementById("loginEmail")
                .value.trim();

            const password = document
                .getElementById("loginPassword")
                .value;

            const message = document
                .getElementById("loginMessage");

            if (!email || password.length < 6) {
                message.textContent =
                    "Enter your email and a password of at least 6 characters.";

                return;
            }

            message.textContent = "Creating account...";

            try {
                const { data, error } = await db.auth
                    .signUp({
                        email,
                        password
                    });

                if (error) {
                    message.textContent = error.message;

                } else if (!data.session) {
                    message.textContent =
                        "Check your email to confirm your account, then log in.";

                } else {
                    message.textContent = "Account created.";
                }

            } catch (error) {
                message.textContent = error.message;
            }
        });
}


// ============================================
// 2. SHOW APPLICATION AFTER LOGIN
// ============================================

function showApp() {

    document.getElementById("loginScreen")?.remove();

    document.querySelectorAll(".sidebar, .main")
        .forEach(element => {
            element.style.display = "";
        });

    setupDocumentUploadInputs();
    loadVehicles();
}


// ============================================
// 3. LOAD VEHICLES FROM SUPABASE
// ============================================

async function loadVehicles() {

    if (!currentUser) return;

    const { data, error } = await db
        .from("vehicles")
        .select("id, data")
        .eq("user_id", currentUser.id);

    if (error) {
        alert("Could not load vehicles: " + error.message);
        return;
    }

    vehicles = (data || []).map(row => ({
        ...row.data,
        id: row.id
    }));

    updateDashboard();
    renderVehicles();
}


// ============================================
// 4. SAVE VEHICLE ONLINE
// ============================================

async function saveVehicleOnline(vehicle) {

    if (!currentUser) {
        throw new Error("Please log in first.");
    }

    const { error } = await db
        .from("vehicles")
        .upsert({
            id: vehicle.id,
            user_id: currentUser.id,
            data: vehicle,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "id"
        });

    if (error) {
        throw error;
    }
}


// ============================================
// DOCUMENT UPLOAD / DOWNLOAD (SUPABASE STORAGE)
// ============================================

function setupDocumentUploadInputs() {
    ["rc", "insurance", "puc", "fitness", "permit"].forEach(docKey => {
        const input = document.getElementById(`${docKey}File`);
        if (!input || input.dataset.uploadBound === "true") return;
        input.dataset.uploadBound = "true";
        input.addEventListener("change", () => uploadVehicleDocument(docKey, input));
    });
}

function safeFileName(name) {
    return String(name || "document").normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(-120) || "document";
}

async function uploadVehicleDocument(docKey, input) {
    const file = input.files?.[0];
    if (!file) return;
    const status = document.getElementById(`${docKey}UploadStatus`);
    const pathInput = document.getElementById(`${docKey}StoragePath`);
    const nameInput = document.getElementById(`${docKey}FileName`);
    try {
        if (!currentUser) throw new Error("Please log in first.");
        if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) throw new Error("Only PDF, JPG and PNG files are allowed.");
        if (file.size > MAX_DOCUMENT_SIZE) throw new Error("File size must be 10 MB or less.");
        let vehicleId = document.getElementById("vehicleId").value;
        if (!vehicleId) {
            vehicleId = crypto.randomUUID();
            document.getElementById("vehicleId").value = vehicleId;
        }
        input.disabled = true;
        if (status) status.textContent = "Uploading...";
        const objectPath = `${currentUser.id}/${vehicleId}/${docKey}_${Date.now()}_${safeFileName(file.name)}`;
        const { error } = await db.storage.from(DOCUMENTS_BUCKET).upload(objectPath, file, {
            cacheControl: "3600", upsert: false, contentType: file.type
        });
        if (error) throw error;
        if (pathInput) pathInput.value = objectPath;
        if (nameInput) nameInput.value = file.name;
        if (status) status.textContent = `Uploaded: ${file.name}. Click “Save Vehicle” to save the record.`;
        input.value = "";
    } catch (error) {
        if (status) status.textContent = `Upload failed: ${error.message}`;
        else alert("Upload failed: " + error.message);
    } finally { input.disabled = false; }
}

async function getVehicleDocumentBlob(storagePath) {
    if (!currentUser) throw new Error("Please log in first.");
    if (!storagePath || !storagePath.startsWith(`${currentUser.id}/`)) throw new Error("Invalid document path.");
    const { data, error } = await db.storage.from(DOCUMENTS_BUCKET).download(storagePath);
    if (error) throw error;
    return data;
}

async function viewVehicleDocument(storagePath, fileName) {
    // Open a tab immediately so browsers do not block the later async navigation.
    const tab = window.open("about:blank", "_blank");
    try {
        const blob = await getVehicleDocumentBlob(storagePath);
        const blobUrl = URL.createObjectURL(blob);
        if (tab) {
            tab.location.href = blobUrl;
            tab.document.title = fileName || "Vehicle Document";
        } else {
            window.location.href = blobUrl;
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
        if (tab) tab.close();
        alert("View failed: " + error.message + "\nCheck that the private Storage bucket and policies are configured.");
    }
}

async function downloadVehicleDocument(storagePath, fileName) {
    try {
        const data = await getVehicleDocumentBlob(storagePath);
        const blobUrl = URL.createObjectURL(data);
        const anchor = document.createElement("a");
        anchor.href = blobUrl; anchor.download = fileName || "vehicle-document";
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
        alert("Download failed: " + error.message + "\nCheck that the private Storage bucket and policies are configured.");
    }
}

// ============================================
// 5. NAVIGATION
// ============================================

function showSection(sectionId, filter = "all") {
    if (sectionId === "expirySection") expiryFilter = filter;

    document.querySelectorAll(".section")
        .forEach(section => {
            section.classList.remove("active");
        });

    document.getElementById(sectionId)
        ?.classList.add("active");

    document.querySelectorAll(".nav-btn")
        .forEach(button => {
            button.classList.remove("active");
        });

    const titles = {
        dashboard: "Dashboard",
        vehicles: "Total Vehicles",
        expirySection: expiryFilter === "expired" ? "Expired Documents" : expiryFilter === "soon" ? "Expiring Soon" : "Expired & Expiring Documents",
        vehicleFormSection: "Vehicle"
    };
    const activeNav = sectionId === "expirySection"
        ? (expiryFilter === "expired" ? 3 : expiryFilter === "soon" ? 2 : -1)
        : sectionId === "vehicles" ? 1 : sectionId === "dashboard" ? 0 : -1;
    const navButtons = [...document.querySelectorAll(".sidebar nav .nav-btn")];
    if (activeNav >= 0 && navButtons[activeNav]) navButtons[activeNav].classList.add("active");

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            titles[sectionId] || "Dashboard";
    }

    if (sectionId === "vehicles") {
        renderVehicles();
    }
    if (sectionId === "expirySection") {
        renderExpiryList();
    }
}


// ============================================
// BULK ADD THE USER-PROVIDED VEHICLE NUMBERS
// ============================================
async function addListedVehicles() {
    if (!currentUser) {
        alert("Please log in first.");
        return;
    }
    const existing = new Set(vehicles.map(v => (v.vehicleNumber || "").toUpperCase()));
    const missing = LISTED_VEHICLE_NUMBERS.filter(number => !existing.has(number));
    if (!missing.length) {
        alert("All listed vehicle numbers are already in your account.");
        return;
    }
    const confirmed = confirm(`Add ${missing.length} missing vehicle records to this logged-in account?

No expiry dates or document files are provided, so those must be entered later.`);
    if (!confirmed) return;

    const added = [];
    try {
        for (const number of missing) {
            const vehicle = {
                id: crypto.randomUUID(),
                vehicleNumber: number,
                vehicleModel: "",
                vehicleType: "Truck",
                owner: "",
                documents: {
                    rc: { link: "", storagePath: "", fileName: "", validity: "expiry", expiry: "" },
                    insurance: { link: "", storagePath: "", fileName: "", expiry: "" },
                    puc: { link: "", storagePath: "", fileName: "", expiry: "" },
                    fitness: { link: "", storagePath: "", fileName: "", expiry: "" },
                    permit: { link: "", storagePath: "", fileName: "", expiry: "" }
                },
                createdAt: new Date().toISOString()
            };
            await saveVehicleOnline(vehicle);
            added.push(vehicle);
        }
        vehicles.push(...added);
        updateDashboard();
        renderVehicles();
        alert(`${added.length} vehicle records added. Now edit each vehicle to enter document expiry dates and upload files.`);
    } catch (error) {
        vehicles.push(...added);
        updateDashboard();
        renderVehicles();
        alert(`Added ${added.length} records before an error occurred: ${error.message}. Please check the Vehicles list before trying again.`);
    }
}

// ============================================
// EXPIRY DETAIL LIST (expired + within 7 days)
// ============================================
function getExpiryItems() {
    const items = [];
    const docLabels = { rc: "RC", insurance: "Insurance", puc: "PUC", fitness: "Fitness", permit: "Permit" };
    vehicles.forEach(vehicle => {
        Object.entries(docLabels).forEach(([key, label]) => {
            const doc = vehicle.documents?.[key] || {};
            if (key === "rc" && doc.validity === "lifetime") return;
            if (!doc.expiry) return;
            const status = getExpiryStatus(doc.expiry);
            if (status !== "expired" && status !== "warning") return;
            const expiryDate = new Date(`${doc.expiry}T00:00:00`);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const days = Math.ceil((expiryDate - today) / 86400000);
            items.push({ vehicleNumber: vehicle.vehicleNumber || "Unknown vehicle", vehicleId: vehicle.id, docKey: key, docName: label, expiry: doc.expiry, days, status });
        });
    });
    return items.sort((a, b) => a.days - b.days || a.vehicleNumber.localeCompare(b.vehicleNumber));
}

function renderExpiryList() {
    const container = document.getElementById("expiryList");
    const summary = document.getElementById("expirySummary");
    const navCount = document.getElementById("navExpiryCount");
    if (!container) return;
    const allItems = getExpiryItems();
    const expired = allItems.filter(item => item.status === "expired").length;
    const soon = allItems.filter(item => item.status === "warning").length;
    const items = expiryFilter === "expired" ? allItems.filter(item => item.status === "expired")
        : expiryFilter === "soon" ? allItems.filter(item => item.status === "warning") : allItems;
    if (navCount) navCount.textContent = items.length;
    if (summary) summary.innerHTML = `<div class="expiry-chip expired-chip">Expired: <strong>${expired}</strong></div><div class="expiry-chip soon-chip">Expiring within 7 days: <strong>${soon}</strong></div>`;
    if (!items.length) {
        const message = expiryFilter === "expired" ? "No expired documents" : expiryFilter === "soon" ? "No documents expiring within 7 days" : "No expired or soon-to-expire documents";
        container.innerHTML = `<div class="empty"><h3>${message}</h3><p>Once document expiry dates are entered, they will appear here automatically.</p></div>`;
        return;
    }
    container.innerHTML = `<div class="expiry-table-wrap"><table class="expiry-table"><thead><tr><th>Vehicle Number</th><th>Document</th><th>Expiry Date</th><th>Status</th><th>Days</th><th>Action</th></tr></thead><tbody>${items.map(item => {
        const statusText = item.days < 0 ? `Expired ${Math.abs(item.days)} day(s) ago` : item.days === 0 ? "Expires today" : `Expires in ${item.days} day(s)`;
        return `<tr><td><strong>${escapeHTML(item.vehicleNumber)}</strong></td><td>${escapeHTML(item.docName)}</td><td>${escapeHTML(item.expiry)}</td><td><span class="status ${item.status === "expired" ? "expired" : "warning"}">${item.status === "expired" ? "Expired" : "Expiring Soon"}</span></td><td>${statusText}</td><td><button class="edit-btn" onclick="editVehicle('${escapeAttribute(item.vehicleId)}')">Edit Vehicle</button></td></tr>`;
    }).join("")}</tbody></table></div>`;
}

// ============================================
// 6. ADD NEW VEHICLE FORM
// ============================================

function openVehicleForm() {

    document.getElementById("vehicleForm").reset();

    document.getElementById("vehicleId").value = crypto.randomUUID();
    ["rc", "insurance", "puc", "fitness", "permit"].forEach(key => {
        const path = document.getElementById(`${key}StoragePath`);
        const fileName = document.getElementById(`${key}FileName`);
        const status = document.getElementById(`${key}UploadStatus`);
        const fileInput = document.getElementById(`${key}File`);
        if (path) path.value = "";
        if (fileName) fileName.value = "";
        if (status) status.textContent = "";
        if (fileInput) fileInput.value = "";
    });

    document.getElementById("formTitle").textContent =
        "Add New Vehicle";

    toggleRCExpiry();

    showSection("vehicleFormSection");
}


// ============================================
// 7. RC LIFETIME OPTION
// ============================================

function toggleRCExpiry() {

    const validity = document.getElementById("rcValidity");

    const expiryBox = document.getElementById("rcExpiryBox");

    const expiry = document.getElementById("rcExpiry");

    if (!validity || !expiryBox || !expiry) {
        return;
    }

    const lifetime = validity.value === "lifetime";

    expiryBox.style.display = lifetime ? "none" : "block";

    expiry.required = !lifetime;

    if (lifetime) {
        expiry.value = "";
    }
}


// ============================================
// 8. SAVE VEHICLE FORM TO DATABASE
// ============================================

document.getElementById("vehicleForm")
    .addEventListener("submit", async event => {

        event.preventDefault();

        if (!currentUser) {
            alert("Please log in first.");
            return;
        }

        const id = document
            .getElementById("vehicleId")
            .value;

        const previous = vehicles.find(vehicle =>
            vehicle.id === id
        );

        const rcValidity =
            document.getElementById("rcValidity")?.value
            || "expiry";


        const vehicle = {

            id: id || crypto.randomUUID(),

            vehicleNumber: document
                .getElementById("vehicleNumber")
                .value.trim()
                .toUpperCase(),

            vehicleModel: document
                .getElementById("vehicleModel")
                .value.trim(),

            vehicleType: document
                .getElementById("vehicleType")
                .value,

            owner: document
                .getElementById("owner")
                .value.trim(),


            documents: {

                rc: {
                    link: "",

                    storagePath: document.getElementById("rcStoragePath")?.value || previous?.documents?.rc?.storagePath || "",
                    fileName: document.getElementById("rcFileName")?.value || previous?.documents?.rc?.fileName || "",

                    validity: rcValidity,

                    expiry: rcValidity === "lifetime"
                        ? ""
                        : document
                            .getElementById("rcExpiry")
                            .value
                },


                insurance: {
                    link: "",

                    storagePath: document.getElementById("insuranceStoragePath")?.value || previous?.documents?.insurance?.storagePath || "",
                    fileName: document.getElementById("insuranceFileName")?.value || previous?.documents?.insurance?.fileName || "",

                    expiry: document
                        .getElementById("insuranceExpiry")
                        .value
                },


                puc: {
                    link: "",

                    storagePath: document.getElementById("pucStoragePath")?.value || previous?.documents?.puc?.storagePath || "",
                    fileName: document.getElementById("pucFileName")?.value || previous?.documents?.puc?.fileName || "",

                    expiry: document
                        .getElementById("pucExpiry")
                        .value
                },


                fitness: {
                    link: "",

                    storagePath: document.getElementById("fitnessStoragePath")?.value || previous?.documents?.fitness?.storagePath || "",
                    fileName: document.getElementById("fitnessFileName")?.value || previous?.documents?.fitness?.fileName || "",

                    expiry: document
                        .getElementById("fitnessExpiry")
                        .value
                },


                permit: {
                    link: "",

                    storagePath: document.getElementById("permitStoragePath")?.value || previous?.documents?.permit?.storagePath || "",
                    fileName: document.getElementById("permitFileName")?.value || previous?.documents?.permit?.fileName || "",

                    expiry: document
                        .getElementById("permitExpiry")
                        .value
                }

            },

            createdAt:
                previous?.createdAt || new Date().toISOString()
        };


        try {

            await saveVehicleOnline(vehicle);

            const index = vehicles.findIndex(item =>
                item.id === vehicle.id
            );

            if (index >= 0) {
                vehicles[index] = vehicle;
            } else {
                vehicles.push(vehicle);
            }

            updateDashboard();
            renderVehicles();

            alert("Vehicle saved online successfully!");

            showSection("vehicles");

        } catch (error) {

            alert("Save failed: " + error.message);

        }
    });


// ============================================
// DASHBOARD QUICK SEARCH
// ============================================
function searchDashboardVehicles(openAll = false) {
    const input = document.getElementById("dashboardSearchInput");
    const results = document.getElementById("dashboardSearchResults");
    if (!input || !results) return;
    const query = input.value.toLowerCase().trim();
    results.hidden = !query;
    if (!query) { results.innerHTML = ""; return; }

    const matches = vehicles.filter(vehicle =>
        [vehicle.vehicleNumber, vehicle.vehicleModel, vehicle.vehicleType, vehicle.owner]
            .some(value => String(value || "").toLowerCase().includes(query))
    );
    results.innerHTML = matches.length
        ? matches.slice(0, 8).map(createVehicleCard).join("")
        : `<div class="empty dashboard-search-empty"><h3>No matching vehicles</h3><p>Check the vehicle number, model, type, or owner name and try again.</p></div>`;

    if (openAll) {
        const listSearch = document.getElementById("searchInput");
        if (listSearch) listSearch.value = query;
        showSection("vehicles");
    }
}

// ============================================
// 9. DISPLAY VEHICLES
// ============================================

function renderVehicles() {

    const container = document.getElementById("vehicleList");

    if (!container) return;

    const search = document
        .getElementById("searchInput")
        ?.value.toLowerCase().trim() || "";

    const filtered = vehicles.filter(vehicle =>

        (vehicle.vehicleNumber || "")
            .toLowerCase()
            .includes(search)

        ||

        (vehicle.vehicleModel || "")
            .toLowerCase()
            .includes(search)
        || (vehicle.vehicleType || "").toLowerCase().includes(search)
        || (vehicle.owner || "").toLowerCase().includes(search)
    );


    container.innerHTML = filtered.length

        ? filtered.map(createVehicleCard).join("")

        : `
            <div class="empty">
                <h3>No vehicles found</h3>
                <p>Add your first vehicle to manage documents.</p>
            </div>
        `;
}


// ============================================
// 10. VEHICLE CARD
// ============================================

function createVehicleCard(vehicle) {

    const docs = vehicle.documents || {};

    const rc = docs.rc || {};

    const rcExpiry = rc.validity === "lifetime"
        ? "Lifetime / No Expiry"
        : rc.expiry;


    return `
        <div class="vehicle-card">

            <div class="vehicle-header">

                <div>
                    <div class="vehicle-number">
                        ${escapeHTML(vehicle.vehicleNumber)}
                    </div>

                    <div class="vehicle-model">
                        ${escapeHTML(vehicle.vehicleModel || "Vehicle")}
                    </div>
                </div>

                <span class="status ${getVehicleStatusClass(vehicle)}">
                    ${getVehicleStatus(vehicle)}
                </span>

            </div>


            <div class="vehicle-info">
                🚚 ${escapeHTML(vehicle.vehicleType || "")}<br>
                👤 ${escapeHTML(vehicle.owner || "Owner not added")}
            </div>


            <div class="documents">

                ${documentButton("RC", rc.link, rcExpiry, rc.storagePath, rc.fileName)}

                ${documentButton(
                    "Insurance",
                    docs.insurance?.link,
                    docs.insurance?.expiry,
                    docs.insurance?.storagePath,
                    docs.insurance?.fileName
                )}

                ${documentButton(
                    "PUC",
                    docs.puc?.link,
                    docs.puc?.expiry,
                    docs.puc?.storagePath,
                    docs.puc?.fileName
                )}

                ${documentButton(
                    "Fitness",
                    docs.fitness?.link,
                    docs.fitness?.expiry,
                    docs.fitness?.storagePath,
                    docs.fitness?.fileName
                )}

                ${documentButton(
                    "Permit",
                    docs.permit?.link,
                    docs.permit?.expiry,
                    docs.permit?.storagePath,
                    docs.permit?.fileName
                )}

            </div>


            <div class="vehicle-actions">

                <button class="edit-btn"
                    onclick="editVehicle('${escapeAttribute(vehicle.id)}')">
                    ✏️ Edit
                </button>

                <button class="delete-btn"
                    onclick="deleteVehicle('${escapeAttribute(vehicle.id)}')">
                    🗑️ Delete
                </button>

            </div>

        </div>
    `;
}


// ============================================
// 11. DOCUMENT BUTTONS
// ============================================

function documentButton(name, link, expiry, storagePath = "", fileName = "") {
    if (!storagePath) return `<button class="doc-btn disabled" disabled>${name} — Not uploaded</button>`;
    const title = expiry ? (name === "RC" && expiry === "Lifetime / No Expiry" ? expiry : "Expiry: " + expiry) : "";
    return `<div class="document-button-group"><button type="button" class="doc-btn view-btn" onclick="viewVehicleDocument('${escapeAttribute(storagePath)}','${escapeAttribute(fileName || name)}')" title="${escapeHTML(title)}">👁️ View ${escapeHTML(name)}</button><button type="button" class="doc-btn download-btn" onclick="downloadVehicleDocument('${escapeAttribute(storagePath)}','${escapeAttribute(fileName || name)}')" title="${escapeHTML(title)}">⬇️ Download</button></div>`;
}

// ============================================
// 12. EDIT VEHICLE
// ============================================

function editVehicle(id) {

    const vehicle = vehicles.find(item =>
        item.id === id
    );

    if (!vehicle) return;


    document.getElementById("vehicleId").value =
        vehicle.id;

    document.getElementById("vehicleNumber").value =
        vehicle.vehicleNumber || "";

    document.getElementById("vehicleModel").value =
        vehicle.vehicleModel || "";

    document.getElementById("vehicleType").value =
        vehicle.vehicleType || "";

    document.getElementById("owner").value =
        vehicle.owner || "";


    const docs = vehicle.documents || {};


    for (const name of [
        "rc",
        "insurance",
        "puc",
        "fitness",
        "permit"
    ]) {

        const doc = docs[name] || {};

        const linkInput =
            document.getElementById(name + "Link");

        const expiryInput =
            document.getElementById(name + "Expiry");


        if (linkInput) {
            linkInput.value = doc.link || "";
        }
        const storagePathInput = document.getElementById(name + "StoragePath");
        const fileNameInput = document.getElementById(name + "FileName");
        const uploadStatus = document.getElementById(name + "UploadStatus");
        const fileInput = document.getElementById(name + "File");
        if (storagePathInput) storagePathInput.value = doc.storagePath || "";
        if (fileNameInput) fileNameInput.value = doc.fileName || "";
        if (uploadStatus) uploadStatus.textContent = doc.fileName ? `Saved file: ${doc.fileName}` : "";
        if (fileInput) fileInput.value = "";

        if (expiryInput) {
            expiryInput.value = doc.expiry || "";
        }
    }


    const validity = document.getElementById("rcValidity");

    if (validity) {

        validity.value =
            docs.rc?.validity === "lifetime"
                ? "lifetime"
                : "expiry";
    }


    toggleRCExpiry();

    document.getElementById("formTitle").textContent =
        "Edit Vehicle";

    showSection("vehicleFormSection");
}


// ============================================
// 13. DELETE VEHICLE FROM DATABASE
// ============================================

async function deleteVehicle(id) {

    const vehicle = vehicles.find(item =>
        item.id === id
    );

    if (
        !vehicle ||
        !confirm(`Delete vehicle ${vehicle.vehicleNumber}?`)
    ) {
        return;
    }


    const { error } = await db
        .from("vehicles")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);


    if (error) {

        alert("Delete failed: " + error.message);

        return;
    }


    vehicles = vehicles.filter(item =>
        item.id !== id
    );

    updateDashboard();
    renderVehicles();
}


// ============================================
// 14. EXPIRY STATUS
// ============================================

function getExpiryStatus(date) {

    if (!date) return "none";

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const expiry = new Date(date + "T00:00:00");

    const days = Math.ceil(
        (expiry - today) / 86400000
    );

    if (days < 0) return "expired";

    if (days <= 7) return "warning";

    return "ok";
}

// ============================================
// 15. VEHICLE STATUS
// ============================================

function getVehicleStatus(vehicle) {
    const docs = Object.values(
        vehicle.documents || {}
    );

    const statuses = docs.map(doc => {
        if (doc.validity === "lifetime") {
            return "ok";
        }

        return getExpiryStatus(doc.expiry);
    });

    if (statuses.includes("expired")) {
        return "Expired";
    }

    if (statuses.includes("warning")) {
        return "Expiring";
    }

    return "Active";
}

function getVehicleStatusClass(vehicle) {
    const status = getVehicleStatus(vehicle);

    if (status === "Expired") {
        return "expired";
    }

    if (status === "Expiring") {
        return "warning";
    }

    return "ok";
}


// ============================================
// 16. DASHBOARD COUNTERS
// ============================================

function updateDashboard() {

    document.getElementById("totalVehicles").textContent =
        vehicles.length;


    let total = 0;
    let expiring = 0;
    let expired = 0;


    vehicles.forEach(vehicle => {

        Object.values(vehicle.documents || {})
            .forEach(doc => {

                if (doc.storagePath) {
                    total++;
                }

                const status =
                    doc.validity === "lifetime"
                        ? "ok"
                        : getExpiryStatus(doc.expiry);


                if (status === "warning") {
                    expiring++;
                }

                if (status === "expired") {
                    expired++;
                }

            });
    });


    document.getElementById("totalDocuments").textContent =
        total;

    document.getElementById("expiringDocuments").textContent =
        expiring;

    document.getElementById("expiredDocuments").textContent =
        expired;

    const allExpiryItems = getExpiryItems();
    const navExpiryCount = document.getElementById("navExpiryCount");
    const navExpiredCount = document.getElementById("navExpiredCount");
    const navVehicleCount = document.getElementById("navVehicleCount");
    if (navExpiryCount) navExpiryCount.textContent = allExpiryItems.filter(item => item.status === "warning").length;
    if (navExpiredCount) navExpiredCount.textContent = allExpiryItems.filter(item => item.status === "expired").length;
    if (navVehicleCount) navVehicleCount.textContent = vehicles.length;

}


// ============================================
// 17. RECENT VEHICLES
// ============================================

function renderRecentVehicles() {

    const container =
        document.getElementById("recentVehicles");

    if (!container) return;


    const recent = [...vehicles]
        .reverse()
        .slice(0, 3);


    container.innerHTML = recent.length

        ? recent.map(createVehicleCard).join("")

        : `
            <div class="empty">
                <h3>No vehicles added</h3>
            </div>
        `;
}


// ============================================
// 18. HTML ESCAPE HELPERS
// ============================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, ch => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

    })[ch]);
}


function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ============================================
// 19. START APPLICATION
// ============================================

setupLoginScreen();


db.auth.onAuthStateChange((event, session) => {

    currentUser = session?.user || null;


    if (currentUser) {

        showApp();

    } else {

        vehicles = [];

        document.querySelectorAll(".sidebar, .main")
            .forEach(element => {
                element.style.display = "none";
            });


        if (!document.getElementById("loginScreen")) {
            setupLoginScreen();
        }
    }
});


