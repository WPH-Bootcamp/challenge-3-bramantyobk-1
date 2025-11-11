// ============================================
// HABIT TRACKER CLI - CHALLENGE 3
// ============================================
// NAME: Bramantyo Bayu Kusumo
// CLASS: WPH 126
// ASSIGNMENT DATE: 5 November 2025
// ============================================

// TODO: Import module
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// TODO: Constants
const DATA_FILE = path.join(__dirname, "habits-data.json");
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

// TODO: Readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function dataUser() {
	const slug =
		String(userProfile.name ?? "Anonymous")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "anonymous";
	return path.join(__dirname, `habits-data-${slug}.json`);
}

// TODO: object userProfile
const userProfile = {
	name: "",
	joinDate: new Date(),
	totalHabits: 0,
	completedThisWeek: 0,

	// TODO: updateStats(habits)
	updateStats(habits = []) {
		const list = Array.isArray(habits) ? habits : [];
		this.totalHabits = list.length;

		this.completedThisWeek = list.filter((habit) => {
			try {
				if (typeof habit.isCompletedThisWeek === "function") {
					return habit.isCompletedThisWeek();
				}
				const completions = habit.getThisWeekCompletions?.() ?? 0;
				const target = habit.targetFrequency ?? 0;
				return completions >= target;
			} catch {
				return false;
			}
		}).length;
	},

	// TODO: getDaysJoined()
	getDaysJoined() {
		const now = new Date();
		const start =
			this.joinDate instanceof Date ? this.joinDate : new Date(this.joinDate);
		const msDiff = now - start;
		return Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
	},
};

// TODO: class Habit
class Habit {
	constructor(name, targetFrequency) {
		this.id = Date.now(); // sederhana untuk unique id
		this.name = name ?? "Habit";
		this.targetFrequency = Number(targetFrequency ?? 0);
		this.completions = []; // berisi ISO string tanggal penyelesaian
		this.createdAt = new Date();
	}

	markComplete() {
		const todayISO = new Date().toISOString();
		this.completions.push(todayISO);
	}

	getThisWeekCompletions() {
		const now = new Date();
		// Tentukan awal minggu (Senin)
		const day = now.getDay();
		const diffToMonday = day === 0 ? 6 : day - 1; // selisih hari ke Senin
		const startOfWeek = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() - diffToMonday
		);
		startOfWeek.setHours(0, 0, 0, 0);

		const endOfWeek = new Date(
			startOfWeek.getFullYear(),
			startOfWeek.getMonth(),
			startOfWeek.getDate() + (DAYS_IN_WEEK - 1)
		);
		endOfWeek.setHours(23, 59, 59, 999);

		return this.completions.filter((iso) => {
			const d = new Date(iso);
			return d >= startOfWeek && d <= endOfWeek;
		}).length;
	}

	isCompletedThisWeek() {
		const target = this.targetFrequency ?? 0;
		if (target <= 0) return false;
		const count = this.getThisWeekCompletions();
		return count >= target;
	}

	getProgressPercentage() {
		const target = this.targetFrequency ?? 0;
		if (target <= 0) return 0;
		const count = this.getThisWeekCompletions();
		const percent = Math.floor((count / target) * 100);
		const widthProgress = 10;
		const filled = Math.round(
			(Math.max(0, Math.min(100, percent)) / 100) * widthProgress
		);
		return (
			"█".repeat(filled) +
			"░".repeat(widthProgress - filled) +
			" " +
			Math.max(0, percent)
		);
	}

	getStatus() {
		return this.isCompletedThisWeek() ? "[Selesai]" : "[Aktif]";
	}

	getDailyStreak() {
		if (!Array.isArray(this.completions) || this.completions.length === 0)
			return 0;

		const normalizedSet = new Set(
			this.completions.map((iso) => {
				const d = new Date(iso);
				return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
			})
		);

		const today = new Date();
		let cursor = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		);
		let streak = 0;

		while (normalizedSet.has(cursor.getTime())) {
			streak++;
			cursor.setDate(cursor.getDate() - 1);
		}

		return streak;
	}
}

class HabitTracker {
	constructor() {
		this.habits = [];
		this.reminderTimer = null;
	}

	addHabit(name, frequency) {
		const habitName = (name ?? "").trim() || "Habit";
		const target = Number(frequency ?? 0);
		const habit = new Habit(habitName, target);
		this.habits.push(habit);
		userProfile.updateStats(this.habits);
		this.saveToFile();
		return habit;
	}

	completeHabit(habitIndex) {
		const index = Number(habitIndex ?? -1);
		const habit = this.habits[index] ?? null;
		if (!habit) return false;
		habit.markComplete();
		userProfile.updateStats(this.habits);
		this.saveToFile();
		return true;
	}

	deleteHabit(habitIndex) {
		const index = Number(habitIndex ?? -1);
		if (index < 0 || index >= this.habits.length) return false;
		this.habits.splice(index, 1);
		userProfile.updateStats(this.habits);
		this.saveToFile();
		return true;
	}

	displayProfile() {
		console.log("##################################################");
		console.log("PROFIL PENGGUNA");
		console.log("##################################################");
		console.log(`Nama: ${userProfile.name ?? "Anonymous"}`);
		console.log(`Hari sejak bergabung: ${userProfile.getDaysJoined()} hari`);
		console.log(`Total kebiasaan: ${userProfile.totalHabits}`);
		console.log(`Selesai minggu ini: ${userProfile.completedThisWeek}`);
		console.log("##################################################\n");
	}

	displayHabits(filter = "all") {
		let list = this.habits;
		if (filter === "active") {
			list = list.filter((habit) => !habit.isCompletedThisWeek());
		} else if (filter === "done") {
			list = list.filter((habit) => habit.isCompletedThisWeek());
		}

		if (list.length === 0) {
			console.log("Belum ada habit untuk ditampilkan.\n");
		} else {
			console.log("\n==================================================");
			console.log("DAFTAR KEBIASAAN");
			console.log("==================================================\n");

			list.forEach((hbt, i) => {
				const progress = hbt.getProgressPercentage();
				const dailyStreak = hbt.getDailyStreak();

				console.log(`${i + 1}. ${hbt.getStatus()} ${hbt.name}`);
				console.log(`   Target: ${hbt.targetFrequency}x/minggu`);
				console.log(
					`   Progress: ${hbt.getThisWeekCompletions()}/${
						hbt.targetFrequency
					} (${progress}%)`
				);
				console.log(`   Streak Harian: ${dailyStreak} hari`);
			});
			console.log("\n==================================================\n");
		}
	}

	displayHabitsWithWhile() {
		console.log("Demo While Loop:");
		let i = 0;
		while (i < this.habits.length) {
			const h = this.habits[i];
			console.log(`- ${h.name} (${h.getStatus()})`);
			i++;
		}
	}

	displayHabitsWithFor() {
		console.log("Demo For Loop:");
		for (let i = 0; i < this.habits.length; i++) {
			const h = this.habits[i];
			console.log(`- ${h.name} (${h.getStatus()})`);
		}
	}

	displayStats() {
		console.log("\n==================================================");
		console.log("STATISTIK");
		console.log("==================================================");

		const total = this.habits.length;
		const activeHabits = this.habits.filter(
			(hbt) => !hbt.isCompletedThisWeek()
		).length;
		const doneHabits = this.habits.filter((hbt) =>
			hbt.isCompletedThisWeek()
		).length;
		const names = this.habits.map((hbt) => hbt.name);
		const anyCompleted = this.habits.some(
			(hbt) => hbt.getProgressPercentage() >= 100
		);

		console.log(`Total habits: ${total}`);
		console.log(`Aktif (belum selesai): ${activeHabits}`);
		console.log(`Selesai (target tercapai): ${doneHabits}`);
		console.log(`Nama habits: ${names.join(", ") || "-"}`);
		console.log(
			`Ada habit yang selesai penuh minggu ini? ${
				anyCompleted ? "Ya" : "Tidak"
			}`
		);

		console.log("Tampilkan semua habit:");
		this.habits.forEach((hbt) => {
			console.log(`- ${hbt.name}: ${hbt.getProgressPercentage()}%`);
		});

		console.log("==================================================\n");
	}

	startReminder() {
		if (this.reminderTimer) return false;
		this.reminderTimer = setInterval(
			() => this.showReminder(),
			REMINDER_INTERVAL
		);
	}

	showReminder() {
		const target =
			this.habits.find((hbt) => !hbt.isCompletedThisWeek()) ?? null;
		if (!target) return false;
		console.log("\n**************************************************");
		console.log(`    REMINDER: Jangan lupa "${target.name}"!`);
		console.log("**************************************************\n");
	}

	stopReminder() {
		if (this.reminderTimer) {
			clearInterval(this.reminderTimer);
			this.reminderTimer = null;
		}
	}

	saveToFile() {
		try {
			const data = {
				user: {
					name: userProfile.name ?? "Anonymous",
					joinDate:
						userProfile.joinDate?.toISOString?.() ?? new Date().toISOString(),
				},
				habits: this.habits.map((hbt) => ({
					id: hbt.id,
					name: hbt.name,
					targetFrequency: hbt.targetFrequency,
					completions: hbt.completions,
					createdAt: hbt.createdAt.toISOString(),
				})),
			};
			const json = JSON.stringify(data, null, 2);
			const file = dataUser();
			fs.writeFileSync(file, json, "utf8");
		} catch (err) {
			console.error("Gagal menyimpan data:", err.message);
		}
	}

	loadFromFile() {
		try {
			const file = dataUser();
			if (!fs.existsSync(file)) return false;
			const json = fs.readFileSync(file, "utf8");
			const data = JSON.parse(json);

			const rawHabits = Array.isArray(data?.habits) ? data.habits : [];
			this.habits = rawHabits.map((raw) => {
				const hbt = new Habit(raw.name ?? "Habit", raw.targetFrequency ?? 0);
				hbt.id = raw.id ?? Date.now();
				hbt.createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
				hbt.completions = Array.isArray(raw.completions) ? raw.completions : [];
				return hbt;
			});

			userProfile.name = data?.user?.name ?? userProfile.name ?? "Anonymous";
			userProfile.joinDate = data?.user?.joinDate
				? new Date(data.user.joinDate)
				: userProfile.joinDate;
			userProfile.updateStats(this.habits);
		} catch (err) {
			console.error("Gagal memuat data:", err.message);
		}
	}

	clearAllData() {
		this.habits = [];
		this.stopReminder();
		try {
			if (fs.existsSync(dataUser())) fs.unlinkSync(dataUser());
		} catch {}
		userProfile.updateStats(this.habits);
	}
}

// ============================================
// HELPER FUNCTIONS
// ============================================
// TODO: Buat function askQuestion(question)
function askQuestion(question) {
	return new Promise((resolve) => {
		rl.question(`${question} `, (answer) => resolve((answer ?? "").trim()));
	});
}

// TODO: Buat function displayMenu()
function displayMenu() {
	console.log("\n==================================================");
	console.log("HABIT TRACKER - MAIN MENU");
	console.log("==================================================");
	console.log("1. Lihat Profil");
	console.log("2. Lihat Semua Kebiasaan");
	console.log("3. Lihat Kebiasaan Aktif");
	console.log("4. Lihat Kebiasaan Selesai");
	console.log("5. Tambah Kebiasaan Baru");
	console.log("6. Tandai Kebiasaan Selesai");
	console.log("7. Hapus Kebiasaan");
	console.log("8. Lihat Statistik");
	console.log("9. Demo Loop (while/for)");
	console.log("0. Keluar");
	console.log("==================================================");
}

// TODO: Buat async function handleMenu(tracker)
async function handleMenu(tracker) {
	tracker.startReminder();

	let running = true;
	while (running) {
		displayMenu();
		const choice = await askQuestion("Pilih menu (0-9):");

		switch (choice) {
			case "1":
				console.log("\n");
				tracker.displayProfile();
				break;
			case "2":
				console.log("\n");
				tracker.displayHabits("all");
				break;
			case "3":
				console.log("\n");
				tracker.displayHabits("active");
				break;
			case "4":
				console.log("\n");
				tracker.displayHabits("done");
				break;
			case "5": {
				const name = await askQuestion("Nama kebiasaan:");
				const freqStr = await askQuestion("Target per minggu (angka):");
				const freq = Number(freqStr ?? 0);

				if (!name || Number.isNaN(freq) || freq < 0) {
					console.log(
						"Input tidak valid. Nama harus terisi dan target >= 0.\n"
					);
					break;
				}

				const habit = tracker.addHabit(name, freq);
				console.log(
					`Ditambahkan: "${habit.name}" dengan target ${habit.targetFrequency}x/minggu.\n`
				);
				break;
			}
			case "6": {
				if (tracker.habits.length === 0) {
					console.log("Belum ada kebiasaan. Tambahkan dulu di menu 5.\n");
					break;
				}

				tracker.displayHabits("all");
				const idxStr = await askQuestion(
					"Masukkan nomor kebiasaan yang selesai hari ini:"
				);
				const idx = Number(idxStr ?? 0) - 1;

				if (!Number.isInteger(idx) || idx < 0 || idx >= tracker.habits.length) {
					console.log("Nomor kebiasaan yang dipilih tidak tersedia.\n");
					break;
				}

				const ok = tracker.completeHabit(idx);
				console.log(
					ok
						? "Kebiasaan ditandai selesai untuk hari ini.\n"
						: "Gagal menandai kebiasaan.\n"
				);
				break;
			}
			case "7": {
				if (tracker.habits.length === 0) {
					console.log("Tidak ada kebiasaan yang dapat dihapus.\n");
					break;
				}

				tracker.displayHabits("all");
				const idxStr = await askQuestion(
					"Masukkan nomor kebiasaan yang akan dihapus:"
				);
				const idx = Number(idxStr ?? 0) - 1;

				if (!Number.isInteger(idx) || idx < 0 || idx >= tracker.habits.length) {
					console.log("Nomor kebiasaan yang dipilih tidak tersedia.\n");
					break;
				}

				const ok = tracker.deleteHabit(idx);
				console.log(
					ok ? "Kebiasaan telah dihapus.\n" : "Gagal menghapus kebiasaan.\n"
				);
				// tracker.saveToFile();
				break;
			}
			case "8":
				tracker.displayStats();
				break;
			case "9":
				tracker.displayHabitsWithWhile();
				tracker.displayHabitsWithFor();
				break;
			case "0":
				running = false;
				tracker.saveToFile();
				tracker.stopReminder();
				console.log("Sampai jumpa! Data akan disimpan otomatis.");
				rl.close();
				break;
			default:
				console.log("Pilihan tidak dikenal. Silakan pilih antara 0-9.");
				break;
		}
	}
}

// ============================================
// MAIN FUNCTION (TAHAP 6)
// ============================================
async function main() {
	const tracker = new HabitTracker();
	const loaded = tracker.loadFromFile();

	// Inisialisasi nama pengguna jika file data tidak ada, kosong, atau tidak berisi user.name
	if (!loaded) {
		const name = await askQuestion("Masukkan nama pengguna:");
		userProfile.name = (name ?? "").trim() || "Anonymous";
		userProfile.joinDate = new Date();
		tracker.saveToFile();
	}

	userProfile.updateStats(tracker.habits);

	await handleMenu(tracker);
}

if (require.main === module) {
	main().catch((err) => {
		console.error("Terjadi kesalahan:", err?.message ?? err);
		try {
			rl.close();
		} catch {}
		process.exitCode = 1;
	});
}
