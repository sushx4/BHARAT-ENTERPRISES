// ============================================
// BHARAT ENTERPRISE - VEHICLE DOCUMENT MANAGER
// SUPABASE DATABASE CONNECTION
// ============================================

const SUPABASE_URL = "https://xkqfvunxvbfdtlyvelmm.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_KY6fRxnRnn8IoBYri9b2Qg_TqKpbbLR";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let vehicles = [];
let currentUser = null;


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
// 5. NAVIGATION
// ============================================

function showSection(sectionId) {

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
        vehicles: "Vehicles",
        vehicleFormSection: "Vehicle"
    };

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            titles[sectionId] || "Dashboard";
    }

    if (sectionId === "vehicles") {
        renderVehicles();
    }
}


// ============================================
// 6. ADD NEW VEHICLE FORM
// ============================================

function openVehicleForm() {

    document.getElementById("vehicleForm").reset();

    document.getElementById("vehicleId").value = "";

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
                    link: document
                        .getElementById("rcLink")
                        .value.trim(),

                    validity: rcValidity,

                    expiry: rcValidity === "lifetime"
                        ? ""
                        : document
                            .getElementById("rcExpiry")
                            .value
                },


                insurance: {
                    link: document
                        .getElementById("insuranceLink")
                        .value.trim(),

                    expiry: document
                        .getElementById("insuranceExpiry")
                        .value
                },


                puc: {
                    link: document
                        .getElementById("pucLink")
                        .value.trim(),

                    expiry: document
                        .getElementById("pucExpiry")
                        .value
                },


                fitness: {
                    link: document
                        .getElementById("fitnessLink")
                        .value.trim(),

                    expiry: document
                        .getElementById("fitnessExpiry")
                        .value
                },


                permit: {
                    link: document
                        .getElementById("permitLink")
                        .value.trim(),

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

                ${documentButton("RC", rc.link, rcExpiry)}

                ${documentButton(
                    "Insurance",
                    docs.insurance?.link,
                    docs.insurance?.expiry
                )}

                ${documentButton(
                    "PUC",
                    docs.puc?.link,
                    docs.puc?.expiry
                )}

                ${documentButton(
                    "Fitness",
                    docs.fitness?.link,
                    docs.fitness?.expiry
                )}

                ${documentButton(
                    "Permit",
                    docs.permit?.link,
                    docs.permit?.expiry
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

function documentButton(name, link, expiry) {

    if (!link) {
        return `
            <button class="doc-btn disabled" disabled>
                ${name}
            </button>
        `;
    }

    const title = expiry
        ? (
            name === "RC" && expiry === "Lifetime / No Expiry"
                ? expiry
                : "Expiry: " + expiry
        )
        : "";


    return `
        <button class="doc-btn"
            onclick="openDocument('${escapeAttribute(link)}')"
            title="${escapeHTML(title)}">

            📄 ${name}

        </button>
    `;
}


function openDocument(link) {

    window.open(link, "_blank", "noopener,noreferrer");

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

    if (days <= 30) return "warning";

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

                if (doc.link) {
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


    renderRecentVehicles();
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


