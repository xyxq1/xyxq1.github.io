const supabaseClient = window.supabase.createClient(
    "https://dwwjjwqowmfcblyaziwz.supabase.co",
    "sb_publishable_hZBVkmok-RYbUT38ZvQoYg_aWtGCk2G"
);

let rolls = 0;
let coins = 0;
let aurasSold = 0;
let bestAura = null;

let luck = 1;
let rollSpeed = 1;

let autoRollOwned = false;
let autoRolling = false;
let autoRollTimeout = null;

let lastRollTime = 0;
let fastClickCount = 0;
let popupOpen = false;
let rolling = false;
let okayTimer = null;

let luckUpgradeIndex = 0;
let speedUpgradeIndex = 0;

const SAVE_KEY = "luckboundSave";
const AUTO_ROLL_PRICE = 500;


function createDefaultSave() {
    return {
        version: 1,
        rolls: 0,
        coins: 0,
        aurasSold: 0,
        bestAura: null,
        luck: 1,
        rollSpeed: 1,
        autoRollOwned: false,
        luckUpgradeIndex: 0,
        speedUpgradeIndex: 0,
        inventory: {},
        discovered: []
    };
}

async function createAccount() {
    const username =
        document.getElementById("username-input").value.trim();

    const email =
        document.getElementById("email-input").value.trim();

    const password =
        document.getElementById("password-input").value;

    if (!username || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const { data, error } =
        await supabase.auth.signUp({
            email: email,
            password: password
        });

    if (error) {
        alert(error.message);
        return;
    }

    const user = data.user;

    if (!user) {
        alert("Account created. Please check your email.");
        return;
    }

    const { error: playerError } =
        await supabase
            .from("players")
            .insert({
                id: user.id,
                username: username,
                save: createDefaultSave()
            });

    if (playerError) {
        alert(playerError.message);
        return;
    }

    showGame();
}

async function login() {
    const email =
        document.getElementById("email-input").value.trim();

    const password =
        document.getElementById("password-input").value;

    if (!email || !password) {
        alert("Enter your email and password.");
        return;
    }

    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {
        alert(error.message);
        return;
    }

    await loadCloudSave();

    showGame();
}

document
    .getElementById("signup-button")
    .addEventListener("click", createAccount);

document
    .getElementById("login-button")
    .addEventListener("click", login);


    function showGame() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game").style.display = "block";
}

async function loadCloudSave() {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.error("No logged-in user.");
        return;
    }

    const { data, error } = await supabase
        .from("players")
        .select("save")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Could not load save:", error);
        return;
    }

    const saveData = data.save;

    rolls =
        Number.isFinite(Number(saveData.rolls))
            ? Math.max(0, Math.floor(Number(saveData.rolls)))
            : 0;

    coins =
        Number.isFinite(Number(saveData.coins))
            ? Math.max(0, Number(saveData.coins))
            : 0;

    aurasSold =
        Number.isFinite(Number(saveData.aurasSold))
            ? Math.max(0, Math.floor(Number(saveData.aurasSold)))
            : 0;

    luck =
        Number.isFinite(Number(saveData.luck))
            ? Math.max(1, Number(saveData.luck))
            : 1;

    rollSpeed =
        Number.isFinite(Number(saveData.rollSpeed))
            ? Math.max(1, Number(saveData.rollSpeed))
            : 1;

    autoRollOwned =
        saveData.autoRollOwned === true;

    luckUpgradeIndex =
        Number.isInteger(saveData.luckUpgradeIndex)
            ? saveData.luckUpgradeIndex
            : 0;

    speedUpgradeIndex =
        Number.isInteger(saveData.speedUpgradeIndex)
            ? saveData.speedUpgradeIndex
            : 0;

    inventory = {};

    if (
        saveData.inventory &&
        typeof saveData.inventory === "object"
    ) {
        for (const aura of auras) {
            const amount =
                Number(saveData.inventory[aura.name]);

            if (
                Number.isFinite(amount) &&
                amount > 0
            ) {
                inventory[aura.name] =
                    Math.floor(amount);
            }
        }
    }

    discovered.clear();

    if (Array.isArray(saveData.discovered)) {
        for (const auraName of saveData.discovered) {
            if (
                auras.some(
                    aura => aura.name === auraName
                )
            ) {
                discovered.add(auraName);
            }
        }
    }

    bestAura = null;

    if (saveData.bestAura) {
        bestAura =
            auras.find(
                aura =>
                    aura.name === saveData.bestAura
            ) || null;
    }

    updateRolls();
    updateCoins();
    updateLuckDisplay();
    updateStats();
    renderShop();

    if (autoRollOwned) {
        autoRollButton.classList.remove("hidden");
    }

    console.log("Luckbound cloud save loaded:", saveData);
}

const rollsElement = document.getElementById("rolls");
const coinsElement = document.getElementById("coins");
const luckElement = document.getElementById("luck");

const auraNameElement = document.getElementById("aura-name");
const auraRarityElement = document.getElementById("aura-rarity");
const rollButton = document.getElementById("roll-button");
const autoRollButton = document.getElementById("auto-roll-button");

const slowDownPopup = document.getElementById("slow-down-popup");
const okayButton = document.getElementById("okay-button");
const okayTimerElement = document.getElementById("okay-timer");

const inventoryButton = document.getElementById("inventory-button");
const discoveredButton = document.getElementById("discovered-button");
const statsButton = document.getElementById("stats-button");
const shopButton = document.getElementById("shop-button");

const inventoryMenu = document.getElementById("inventory-menu");
const discoveredMenu = document.getElementById("discovered-menu");
const statsMenu = document.getElementById("stats-menu");
const shopMenu = document.getElementById("shop-menu");

const inventoryClose = document.getElementById("inventory-close");
const discoveredClose = document.getElementById("discovered-close");
const statsClose = document.getElementById("stats-close");
const shopClose = document.getElementById("shop-close");

const inventoryList = document.getElementById("inventory-list");
const discoveredList = document.getElementById("discovered-list");
const discoveredCount = document.getElementById("discovered-count");

const statRolls = document.getElementById("stat-rolls");
const statCoins = document.getElementById("stat-coins");
const statBestAura = document.getElementById("stat-best-aura");
const statBestRarity = document.getElementById("stat-best-rarity");
const statDiscovered = document.getElementById("stat-discovered");
const statSold = document.getElementById("stat-sold");

const luckShopList = document.getElementById("luck-shop-list");
const speedShopList = document.getElementById("speed-shop-list");
const autoRollShopList = document.getElementById("auto-roll-shop-list");

const auras = [
    {
        name: "Plain",
        rarity: 2,
        color: "#ffffff",
        glow: false,
        sellValue: 1
    },
    {
        name: "Spark",
        rarity: 5,
        color: "#ffe66d",
        glow: false,
        sellValue: 3
    },
    {
        name: "Static",
        rarity: 10,
        color: "#5ce1e6",
        glow: false,
        sellValue: 5
    },
    {
        name: "Glimmer",
        rarity: 25,
        color: "#c77dff",
        glow: false,
        sellValue: 10
    },
    {
        name: "Eclipse",
        rarity: 100,
        color: "#ff4d5a",
        glow: false,
        sellValue: 25
    },
    {
        name: "Void",
        rarity: 500,
        color: "#6f8cff",
        glow: true,
        sellValue: 75
    },
    {
        name: "Amethyst",
        rarity: 1250,
        color: "#b85cff",
        glow: true,
        sellValue: 150
    },
    {
        name: "Starlit",
        rarity: 2500,
        color: "#fff1a8",
        glow: true,
        sellValue: 250
    },
    {
        name: "Aurora",
        rarity: 5000,
        color: "#7affd7",
        glow: true,
        sellValue: 400
    },
    {
        name: "Sapphire",
        rarity: 7500,
        color: "#4da6ff",
        glow: true,
        sellValue: 550
    },
    {
        name: "Moonlight",
        rarity: 10000,
        color: "#b8dcff",
        glow: true,
        sellValue: 700
    },
    {
        name: "Nebula",
        rarity: 15000,
        color: "#d879ff",
        glow: true,
        sellValue: 1000
    },
    {
        name: "Celestial",
        rarity: 25000,
        color: "#ffe08a",
        glow: true,
        sellValue: 1500
    },
    {
        name: "Bloodmoon",
        rarity: 50000,
        color: "#ff304f",
        glow: true,
        sellValue: 2500
    },
    {
        name: "Seraphim",
        rarity: 100000,
        color: "#fff5d6",
        glow: true,
        sellValue: 4000
    },
    {
        name: "Eternal",
        rarity: 250000,
        color: "#8fffff",
        glow: true,
        sellValue: 7500
    },
    {
        name: "Infinity",
        rarity: 1000000,
        color: "#9c7cff",
        glow: true,
        sellValue: 15000
    }
];

const luckUpgrades = [
    {
        name: "Lucky",
        multiplier: 1.25,
        price: 250
    },
    {
        name: "Fortunate",
        multiplier: 1.5,
        price: 750
    },
    {
        name: "Blessed",
        multiplier: 2,
        price: 2500
    }
];

const speedUpgrades = [
    {
        name: "Quick Hands",
        multiplier: 1.1,
        price: 500
    },
    {
        name: "Rapid",
        multiplier: 1.2,
        price: 1500
    },
    {
        name: "Lightning",
        multiplier: 1.35,
        price: 5000
    }
];

const inventory = {};
const discovered = new Set();

function getLuckFactor(rarity) {
    if (rarity <= 2) {
        return 1;
    }

    const rarityScale = Math.log10(rarity);

    const luckEffect =
        1 + ((luck - 1) * (0.55 + rarityScale * 0.08));

    return Math.max(1, luckEffect);
}

function getAuraWeight(aura) {
    const baseWeight = 1 / aura.rarity;
    const luckFactor = getLuckFactor(aura.rarity);

    return baseWeight * luckFactor;
}

function getRandomAura() {
    const weightedAuras = auras.map(aura => {
        return {
            aura: aura,
            weight: getAuraWeight(aura)
        };
    });

    const totalWeight = weightedAuras.reduce(
        (total, entry) => total + entry.weight,
        0
    );

    let random = Math.random() * totalWeight;

    for (const entry of weightedAuras) {
        random -= entry.weight;

        if (random <= 0) {
            return entry.aura;
        }
    }

    return auras[0];
}

function displayAura(aura) {
    auraNameElement.textContent = aura.name;

    auraRarityElement.textContent =
        `1 in ${aura.rarity.toLocaleString()}`;

    auraNameElement.style.color = aura.color;

    if (aura.glow) {
        auraNameElement.classList.add("aura-glow");
    } else {
        auraNameElement.classList.remove("aura-glow");
    }
}

function playAuraAnimation() {
    auraNameElement.classList.remove("aura-bounce");

    void auraNameElement.offsetWidth;

    auraNameElement.classList.add("aura-bounce");
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function playRollAnimation(finalAura) {
    const baseDuration = 1400;
    const animationDuration = baseDuration / rollSpeed;

    const startTime = Date.now();

    let delay = 55 / rollSpeed;

    while (Date.now() - startTime < animationDuration) {
        const randomAura =
            auras[Math.floor(Math.random() * auras.length)];

        displayAura(randomAura);

        await sleep(delay);

        const elapsed = Date.now() - startTime;
        const progress = elapsed / animationDuration;

        delay =
            (55 + Math.floor(progress * 140)) / rollSpeed;
    }

    displayAura(finalAura);

    playAuraAnimation();
}

function updateInventory(aura) {
    if (!inventory[aura.name]) {
        inventory[aura.name] = 0;
    }

    inventory[aura.name]++;
}

function updateDiscovered(aura) {
    discovered.add(aura.name);
}

function updateCoins() {
    coinsElement.textContent =
        coins.toLocaleString();

    statCoins.textContent =
        coins.toLocaleString();
}

function updateRolls() {
    rollsElement.textContent =
        rolls.toLocaleString();

    statRolls.textContent =
        rolls.toLocaleString();
}

function updateLuckDisplay() {
    luckElement.textContent =
        `${luck.toFixed(2)}×`;
}

function updateStats() {
    updateRolls();
    updateCoins();

    statSold.textContent =
        aurasSold.toLocaleString();

    statDiscovered.textContent =
        `${discovered.size} / ${auras.length}`;

    if (bestAura) {
        statBestAura.textContent =
            bestAura.name;

        statBestAura.style.color =
            bestAura.color;

        statBestRarity.textContent =
            `1 in ${bestAura.rarity.toLocaleString()}`;
    } else {
        statBestAura.textContent =
            "None";

        statBestAura.style.color =
            "#888";

        statBestRarity.textContent =
            "---";
    }
}

function checkBestAura(aura) {
    if (
        !bestAura ||
        aura.rarity > bestAura.rarity
    ) {
        bestAura = aura;
    }
}

async function saveGame() {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.error("Cannot save: no logged-in user.");
        return;
    }

    const saveData = {
        version: 1,
        rolls: Number(rolls),
        coins: Number(coins),
        aurasSold: Number(aurasSold),

        bestAura: bestAura
            ? bestAura.name
            : null,

        luck: Number(luck),
        rollSpeed: Number(rollSpeed),

        autoRollOwned:
            autoRollOwned === true,

        luckUpgradeIndex:
            Number(luckUpgradeIndex),

        speedUpgradeIndex:
            Number(speedUpgradeIndex),

        inventory: {
            ...inventory
        },

        discovered:
            Array.from(discovered)
    };

    const { error } = await supabase
        .from("players")
        .update({
            save: saveData,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

    if (error) {
        console.error("Luckbound save failed:", error);
        return;
    }

    console.log("Luckbound saved:", saveData);

}


function loadGame() {
    try {
        const savedGame =
            localStorage.getItem(SAVE_KEY);

        if (!savedGame) {
            console.log(
                "No Luckbound save found."
            );

            return;
        }

        const saveData =
            JSON.parse(savedGame);

        if (
            typeof saveData.rolls === "number" &&
            Number.isFinite(saveData.rolls)
        ) {
            rolls = Math.max(
                0,
                Math.floor(saveData.rolls)
            );
        } else {
            rolls = 0;
        }

        if (
            typeof saveData.coins === "number" &&
            Number.isFinite(saveData.coins)
        ) {
            coins = Math.max(
                0,
                saveData.coins
            );
        } else {
            coins = 0;
        }

        if (
            typeof saveData.aurasSold === "number" &&
            Number.isFinite(saveData.aurasSold)
        ) {
            aurasSold = Math.max(
                0,
                Math.floor(saveData.aurasSold)
            );
        } else {
            aurasSold = 0;
        }

        if (
            typeof saveData.luck === "number" &&
            Number.isFinite(saveData.luck)
        ) {
            luck = Math.max(
                1,
                saveData.luck
            );
        } else {
            luck = 1;
        }

        if (
            typeof saveData.rollSpeed === "number" &&
            Number.isFinite(saveData.rollSpeed)
        ) {
            rollSpeed = Math.max(
                1,
                saveData.rollSpeed
            );
        } else {
            rollSpeed = 1;
        }

        autoRollOwned =
            saveData.autoRollOwned === true;

        luckUpgradeIndex =
            Number.isInteger(
                saveData.luckUpgradeIndex
            )
                ? saveData.luckUpgradeIndex
                : 0;

        speedUpgradeIndex =
            Number.isInteger(
                saveData.speedUpgradeIndex
            )
                ? saveData.speedUpgradeIndex
                : 0;

        luckUpgradeIndex =
            Math.max(
                0,
                Math.min(
                    luckUpgradeIndex,
                    luckUpgrades.length
                )
            );

        speedUpgradeIndex =
            Math.max(
                0,
                Math.min(
                    speedUpgradeIndex,
                    speedUpgrades.length
                )
            );

        Object.keys(inventory).forEach(
            key => delete inventory[key]
        );

        if (
            saveData.inventory &&
            typeof saveData.inventory === "object"
        ) {
            for (const aura of auras) {
                const amount =
                    Number(
                        saveData.inventory[aura.name]
                    );

                if (
                    Number.isFinite(amount) &&
                    amount > 0
                ) {
                    inventory[aura.name] =
                        Math.floor(amount);
                }
            }
        }

        discovered.clear();

        if (
            Array.isArray(
                saveData.discovered
            )
        ) {
            for (
                const auraName
                of saveData.discovered
            ) {
                if (
                    auras.some(
                        aura =>
                            aura.name === auraName
                    )
                ) {
                    discovered.add(
                        auraName
                    );
                }
            }
        }

        bestAura = null;

        if (saveData.bestAura) {
            bestAura =
                auras.find(
                    aura =>
                        aura.name ===
                        saveData.bestAura
                ) || null;
        }

        updateRolls();
        updateCoins();
        updateLuckDisplay();
        updateStats();

        if (autoRollOwned) {
            autoRollButton.classList.remove(
                "hidden"
            );
        }

        renderShop();

        console.log(
            "Luckbound loaded:",
            saveData
        );
    } catch (error) {
        console.error(
            "Luckbound load failed:",
            error
        );
    }
}

function sellAura(aura) {
    const count =
        inventory[aura.name] || 0;

    if (count <= 0) {
        return;
    }

    inventory[aura.name]--;

    coins += aura.sellValue;
    aurasSold++;

    updateCoins();
    updateStats();

    renderInventory();

    saveGame();
}

function sellAllAuras() {
    let totalCoins = 0;
    let totalSold = 0;

    for (const aura of auras) {
        const count =
            inventory[aura.name] || 0;

        if (count <= 0) {
            continue;
        }

        totalCoins +=
            count * aura.sellValue;

        totalSold += count;

        inventory[aura.name] = 0;
    }

    if (totalSold <= 0) {
        return;
    }

    coins += totalCoins;
    aurasSold += totalSold;

    updateCoins();
    updateStats();

    renderInventory();

    saveGame();
}

function renderInventory() {
    inventoryList.innerHTML = "";

    const sellAllButton =
        document.createElement("button");

    sellAllButton.className =
        "sell-button";

    sellAllButton.textContent =
        "Sell All";

    sellAllButton.style.width =
        "100%";

    sellAllButton.style.marginBottom =
        "10px";

    sellAllButton.addEventListener(
        "click",
        sellAllAuras
    );

    inventoryList.appendChild(
        sellAllButton
    );

    let hasAuras = false;

    for (const aura of auras) {
        const count =
            inventory[aura.name] || 0;

        if (count <= 0) {
            continue;
        }

        hasAuras = true;

        const entry =
            document.createElement("div");

        entry.className =
            "aura-entry";

        const name =
            document.createElement("span");

        name.className =
            "aura-entry-name";

        name.textContent =
            aura.name;

        name.style.color =
            aura.color;

        const rarity =
            document.createElement("span");

        rarity.className =
            "aura-entry-rarity";

        rarity.textContent =
            `1 in ${aura.rarity.toLocaleString()}`;

        const amount =
            document.createElement("span");

        amount.className =
            "aura-entry-count";

        amount.textContent =
            `x${count}`;

        const sellButton =
            document.createElement("button");

        sellButton.className =
            "sell-button";

        sellButton.textContent =
            `Sell +${aura.sellValue.toLocaleString()}`;

        sellButton.addEventListener(
            "click",
            () => {
                sellAura(aura);
            }
        );

        entry.appendChild(name);
        entry.appendChild(rarity);
        entry.appendChild(amount);
        entry.appendChild(sellButton);

        inventoryList.appendChild(entry);
    }

    if (!hasAuras) {
        const empty =
            document.createElement("div");

        empty.className =
            "aura-entry";

        const text =
            document.createElement("span");

        text.className =
            "aura-entry-name";

        text.textContent =
            "Your inventory is empty.";

        text.style.color =
            "#666";

        empty.appendChild(text);

        inventoryList.appendChild(empty);
    }
}

function renderDiscovered() {
    discoveredList.innerHTML = "";

    for (const aura of auras) {
        const isDiscovered =
            discovered.has(aura.name);

        const entry =
            document.createElement("div");

        entry.className =
            "aura-entry";

        const name =
            document.createElement("span");

        name.className =
            "aura-entry-name";

        const rarity =
            document.createElement("span");

        rarity.className =
            "aura-entry-rarity";

        if (isDiscovered) {
            name.textContent =
                aura.name;

            name.style.color =
                aura.color;

            rarity.textContent =
                `1 in ${aura.rarity.toLocaleString()}`;
        } else {
            name.textContent =
                "???";

            name.style.color =
                "#555";

            rarity.textContent =
                "1 in ???";
        }

        entry.appendChild(name);
        entry.appendChild(rarity);

        discoveredList.appendChild(entry);
    }

    discoveredCount.textContent =
        `${discovered.size} / ${auras.length} Discovered`;
}

function renderLuckShop() {
    luckShopList.innerHTML = "";

    luckUpgrades.forEach(
        (upgrade, index) => {
            const item =
                document.createElement("div");

            item.className =
                "shop-item";

            const info =
                document.createElement("div");

            info.className =
                "shop-item-info";

            const name =
                document.createElement("div");

            name.className =
                "shop-item-name";

            name.textContent =
                upgrade.name;

            const description =
                document.createElement("div");

            description.className =
                "shop-item-description";

            description.textContent =
                `${upgrade.multiplier.toFixed(2)}× Luck`;

            const price =
                document.createElement("div");

            price.className =
                "shop-item-price";

            price.textContent =
                `${upgrade.price.toLocaleString()} Coins`;

            info.appendChild(name);
            info.appendChild(description);
            info.appendChild(price);

            const button =
                document.createElement("button");

            button.className =
                "shop-buy-button";

            if (
                index < luckUpgradeIndex
            ) {
                button.textContent =
                    "OWNED";

                button.classList.add(
                    "owned"
                );

                button.disabled =
                    true;
            } else if (
                index === luckUpgradeIndex
            ) {
                button.textContent =
                    "BUY";

                button.addEventListener(
                    "click",
                    () => {
                        buyLuckUpgrade(index);
                    }
                );

                if (
                    coins < upgrade.price
                ) {
                    button.disabled =
                        true;
                }
            } else {
                button.textContent =
                    "LOCKED";

                button.disabled =
                    true;
            }

            item.appendChild(info);
            item.appendChild(button);

            luckShopList.appendChild(item);
        }
    );
}

function renderSpeedShop() {
    speedShopList.innerHTML = "";

    speedUpgrades.forEach(
        (upgrade, index) => {
            const item =
                document.createElement("div");

            item.className =
                "shop-item";

            const info =
                document.createElement("div");

            info.className =
                "shop-item-info";

            const name =
                document.createElement("div");

            name.className =
                "shop-item-name";

            name.textContent =
                upgrade.name;

            const description =
                document.createElement("div");

            description.className =
                "shop-item-description";

            description.textContent =
                `${Math.round(
                    (upgrade.multiplier - 1) * 100
                )}% faster rolls`;

            const price =
                document.createElement("div");

            price.className =
                "shop-item-price";

            price.textContent =
                `${upgrade.price.toLocaleString()} Coins`;

            info.appendChild(name);
            info.appendChild(description);
            info.appendChild(price);

            const button =
                document.createElement("button");

            button.className =
                "shop-buy-button";

            if (
                index < speedUpgradeIndex
            ) {
                button.textContent =
                    "OWNED";

                button.classList.add(
                    "owned"
                );

                button.disabled =
                    true;
            } else if (
                index === speedUpgradeIndex
            ) {
                button.textContent =
                    "BUY";

                button.addEventListener(
                    "click",
                    () => {
                        buySpeedUpgrade(index);
                    }
                );

                if (
                    coins < upgrade.price
                ) {
                    button.disabled =
                        true;
                }
            } else {
                button.textContent =
                    "LOCKED";

                button.disabled =
                    true;
            }

            item.appendChild(info);
            item.appendChild(button);

            speedShopList.appendChild(item);
        }
    );
}

function renderAutoRollShop() {
    autoRollShopList.innerHTML = "";

    const item =
        document.createElement("div");

    item.className =
        "shop-item";

    const info =
        document.createElement("div");

    info.className =
        "shop-item-info";

    const name =
        document.createElement("div");

    name.className =
        "shop-item-name";

    name.textContent =
        "Auto-Roll";

    const description =
        document.createElement("div");

    description.className =
        "shop-item-description";

    description.textContent =
        "Automatically rolls for you.";

    const price =
        document.createElement("div");

    price.className =
        "shop-item-price";

    price.textContent =
        `${AUTO_ROLL_PRICE.toLocaleString()} Coins`;

    info.appendChild(name);
    info.appendChild(description);
    info.appendChild(price);

    const button =
        document.createElement("button");

    button.className =
        "shop-buy-button";

    if (autoRollOwned) {
        button.textContent =
            "OWNED";

        button.classList.add(
            "owned"
        );

        button.disabled =
            true;
    } else {
        button.textContent =
            "BUY";

        button.addEventListener(
            "click",
            buyAutoRoll
        );

        if (
            coins < AUTO_ROLL_PRICE
        ) {
            button.disabled =
                true;
        }
    }

    item.appendChild(info);
    item.appendChild(button);

    autoRollShopList.appendChild(item);
}

function renderShop() {
    renderLuckShop();
    renderSpeedShop();
    renderAutoRollShop();
}

function buyLuckUpgrade(index) {
    const upgrade =
        luckUpgrades[index];

    if (
        index !== luckUpgradeIndex
    ) {
        return;
    }

    if (
        coins < upgrade.price
    ) {
        return;
    }

    coins -= upgrade.price;

    luck =
        upgrade.multiplier;

    luckUpgradeIndex++;

    updateCoins();
    updateLuckDisplay();
    updateStats();

    renderShop();

    saveGame();
}

function buySpeedUpgrade(index) {
    const upgrade =
        speedUpgrades[index];

    if (
        index !== speedUpgradeIndex
    ) {
        return;
    }

    if (
        coins < upgrade.price
    ) {
        return;
    }

    coins -= upgrade.price;

    rollSpeed =
        upgrade.multiplier;

    speedUpgradeIndex++;

    updateCoins();
    updateStats();

    renderShop();

    saveGame();
}

function buyAutoRoll() {
    if (autoRollOwned) {
        return;
    }

    if (
        coins < AUTO_ROLL_PRICE
    ) {
        return;
    }

    coins -= AUTO_ROLL_PRICE;

    autoRollOwned =
        true;

    autoRollButton.classList.remove(
        "hidden"
    );

    updateCoins();
    updateStats();

    renderShop();

    saveGame();
}

function startAutoRoll() {
    if (
        !autoRollOwned ||
        autoRolling ||
        popupOpen
    ) {
        return;
    }

    autoRolling =
        true;

    autoRollButton.classList.add(
        "active"
    );

    autoRollButton.textContent =
        "AUTO-ROLL ON";

    runAutoRoll();
}

function stopAutoRoll() {
    autoRolling =
        false;

    clearTimeout(
        autoRollTimeout
    );

    autoRollButton.classList.remove(
        "active"
    );

    autoRollButton.textContent =
        "AUTO-ROLL";
}

async function runAutoRoll() {
    if (
        !autoRolling ||
        popupOpen
    ) {
        return;
    }

    if (rolling) {
        autoRollTimeout =
            setTimeout(
                runAutoRoll,
                100
            );

        return;
    }

    await roll(true);

    if (autoRolling) {
        autoRollTimeout =
            setTimeout(
                runAutoRoll,
                100
            );
    }
}

function showSlowDownPopup() {
    popupOpen =
        true;

    slowDownPopup.classList.add(
        "active"
    );

    okayButton.disabled =
        true;

    let remainingTime =
        10;

    okayTimerElement.textContent =
        remainingTime;

    clearInterval(
        okayTimer
    );

    okayTimer =
        setInterval(() => {
            remainingTime--;

            okayTimerElement.textContent =
                remainingTime;

            if (
                remainingTime <= 0
            ) {
                clearInterval(
                    okayTimer
                );

                okayButton.disabled =
                    false;

                okayTimerElement.textContent =
                    "";
            }
        }, 1000);
}

function closeSlowDownPopup() {
    popupOpen =
        false;

    slowDownPopup.classList.remove(
        "active"
    );

    clearInterval(
        okayTimer
    );

    okayButton.disabled =
        false;

    okayTimerElement.textContent =
        "";

    fastClickCount =
        0;
}

function openInventory() {
    if (
        rolling ||
        popupOpen
    ) {
        return;
    }

    renderInventory();

    inventoryMenu.classList.add(
        "active"
    );
}

function closeInventory() {
    inventoryMenu.classList.remove(
        "active"
    );
}

function openDiscovered() {
    if (
        rolling ||
        popupOpen
    ) {
        return;
    }

    renderDiscovered();

    discoveredMenu.classList.add(
        "active"
    );
}

function closeDiscovered() {
    discoveredMenu.classList.remove(
        "active"
    );
}

function openStats() {
    if (
        rolling ||
        popupOpen
    ) {
        return;
    }

    updateStats();

    statsMenu.classList.add(
        "active"
    );
}

function closeStats() {
    statsMenu.classList.remove(
        "active"
    );
}

function openShop() {
    if (
        rolling ||
        popupOpen
    ) {
        return;
    }

    renderShop();

    shopMenu.classList.add(
        "active"
    );
}

function closeShop() {
    shopMenu.classList.remove(
        "active"
    );
}

async function roll(isAutoRoll = false) {
    if (
        popupOpen ||
        rolling
    ) {
        return;
    }

    if (!isAutoRoll) {
        const currentTime =
            Date.now();

        if (
            lastRollTime !== 0
        ) {
            const timeSinceLastRoll =
                currentTime -
                lastRollTime;

            if (
                timeSinceLastRoll < 150
            ) {
                fastClickCount++;
            } else {
                fastClickCount =
                    0;
            }

            if (
                fastClickCount >= 3
            ) {
                showSlowDownPopup();
                return;
            }
        }

        lastRollTime =
            currentTime;
    }

    rolling =
        true;

    rollButton.disabled =
        true;

    if (autoRollOwned) {
        autoRollButton.disabled =
            true;
    }

    rolls++;

    updateRolls();

    const finalAura =
        getRandomAura();

    updateInventory(
        finalAura
    );

    updateDiscovered(
        finalAura
    );

    checkBestAura(
        finalAura
    );

    updateStats();

    saveGame();

    await playRollAnimation(
        finalAura
    );

    rolling =
        false;

    rollButton.disabled =
        false;

    if (autoRollOwned) {
        autoRollButton.disabled =
            false;
    }

    saveGame();
}

rollButton.addEventListener(
    "click",
    () => {
        roll(false);
    }
);

autoRollButton.addEventListener(
    "click",
    () => {
        if (autoRolling) {
            stopAutoRoll();
        } else {
            startAutoRoll();
        }
    }
);

okayButton.addEventListener(
    "click",
    () => {
        if (!okayButton.disabled) {
            closeSlowDownPopup();
        }
    }
);

inventoryButton.addEventListener(
    "click",
    openInventory
);

discoveredButton.addEventListener(
    "click",
    openDiscovered
);

statsButton.addEventListener(
    "click",
    openStats
);

shopButton.addEventListener(
    "click",
    openShop
);

inventoryClose.addEventListener(
    "click",
    closeInventory
);

discoveredClose.addEventListener(
    "click",
    closeDiscovered
);

statsClose.addEventListener(
    "click",
    closeStats
);

shopClose.addEventListener(
    "click",
    closeShop
);

inventoryMenu.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            inventoryMenu
        ) {
            closeInventory();
        }
    }
);

discoveredMenu.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            discoveredMenu
        ) {
            closeDiscovered();
        }
    }
);

statsMenu.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            statsMenu
        ) {
            closeStats();
        }
    }
);

shopMenu.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            shopMenu
        ) {
            closeShop();
        }
    }
);

async function checkExistingLogin() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        return;
    }

    await loadCloudSave();
    showGame();
}

checkExistingLogin();

updateRolls();
updateCoins();
updateLuckDisplay();
updateStats();

// window.addEventListener(
//     "beforeunload",
//     () => {
//         saveGame();
//     }
// );
