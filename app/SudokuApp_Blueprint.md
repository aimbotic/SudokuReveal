# SudokuReveal — iOS App Architecture Blueprint

> Production-quality, offline-first Sudoku puzzle app with image-reveal reward system.
> Stack: Swift 5.9 · SwiftUI · MVVM+Coordinator · SQLite (GRDB) · No backend required.

---

## Table of Contents

1. [Architecture Design](#1-architecture-design)
2. [Data Models](#2-data-models)
3. [Storage Strategy](#3-storage-strategy)
4. [Sudoku Engine](#4-sudoku-engine)
5. [UI Structure](#5-ui-structure)
6. [Puzzle View UX](#6-puzzle-view-ux)
7. [Image Reveal System](#7-image-reveal-system)
8. [Progression System](#8-progression-system)
9. [Credit System](#9-credit-system)
10. [Accessibility](#10-accessibility)
11. [Offline Support](#11-offline-support)
12. [Sample Implementation](#12-sample-implementation)
13. [File Structure](#13-file-structure)
14. [Performance Considerations](#14-performance-considerations)
15. [Testing Strategy](#15-testing-strategy)

---

## 1. Architecture Design

### Pattern: MVVM + Coordinator + Service Layer

MVVM alone is insufficient for a production app of this scope. We add:

- **Coordinator** — handles navigation flow (no NavigationPath spaghetti)
- **Service Layer** — database, puzzle engine, and credit logic sit outside ViewModels
- **Repository Pattern** — data access is abstracted; ViewModels never touch SQLite directly

```
┌─────────────────────────────────────────────────────┐
│                      SwiftUI Views                  │
│   HomeView · PuzzleView · PackSelectionView · etc   │
└──────────────────────┬──────────────────────────────┘
                       │ observes @StateObject / @ObservedObject
┌──────────────────────▼──────────────────────────────┐
│                    ViewModels                       │
│  HomeVM · PuzzleVM · PackSelectionVM · GalleryVM    │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────┐   ┌────────────▼────────────────┐
│  SudokuEngine   │   │        Services              │
│  (pure logic)   │   │  PuzzleRepository            │
└─────────────────┘   │  ProgressService             │
                      │  CreditService               │
                      │  ImageTileService            │
                      └────────────┬────────────────┘
                                   │
                      ┌────────────▼────────────────┐
                      │     Database (GRDB/SQLite)   │
                      │     + Bundle Assets          │
                      └─────────────────────────────┘
```

### Module Separation

| Module | Responsibility |
|---|---|
| `Core/` | Models, DB schema, engine — zero UI dependencies |
| `Services/` | Business logic, repository pattern |
| `Features/` | One folder per screen (View + ViewModel) |
| `Shared/` | Reusable UI components, extensions, constants |
| `Resources/` | Puzzle JSON bundles, image assets |

### Dependency Injection

Use a lightweight `AppContainer` (no third-party DI framework needed):

```swift
@MainActor
final class AppContainer {
    static let shared = AppContainer()

    lazy var database: DatabaseQueue = {
        let path = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("sudoku.db").path
        return try! DatabaseQueue(path: path)
    }()

    lazy var puzzleRepo: PuzzleRepository = PuzzleRepositoryImpl(db: database)
    lazy var progressService: ProgressService = ProgressServiceImpl(db: database)
    lazy var creditService: CreditService = CreditServiceImpl(db: database)
    lazy var imageTileService: ImageTileService = ImageTileServiceImpl()
}
```

---

## 2. Data Models

All core models are value types (`struct`) unless reference semantics are justified.

```swift
// MARK: - Puzzle

struct Puzzle: Identifiable, Codable {
    let id: String            // "easy_0001"
    let difficulty: Difficulty
    let packID: String
    let imageID: String       // links to ImageAsset
    let given: [Int]          // 81 values, 0 = empty
    let solution: [Int]       // 81 values, complete solution

    enum Difficulty: String, Codable, CaseIterable {
        case easy, medium, hard, insane
    }
}

// MARK: - PuzzleState (mutable, persisted per-puzzle)

struct PuzzleState: Codable {
    let puzzleID: String
    var board: [Int]            // 81 values (user-placed numbers)
    var notes: [[Set<Int>]]     // 81 cells × set of pencil marks
    var undoStack: [UndoAction]
    var hintsUsed: Int
    var isCompleted: Bool
    var elapsedSeconds: Int
    var startedAt: Date

    struct UndoAction: Codable {
        let index: Int
        let previousValue: Int
        let previousNotes: Set<Int>
    }
}

// MARK: - UserProgress

struct UserProgress: Codable {
    var completedPuzzleIDs: Set<String>
    var streakDays: Int
    var lastPlayedDate: Date?
    var unlockedPackIDs: Set<String>
}

// MARK: - ImageAsset & Tiles

struct ImageAsset: Identifiable, Codable {
    let id: String
    let packID: String
    let filename: String         // stored in app bundle or Documents/
    let title: String
    var isRevealed: Bool         // true after puzzle completion

    /// Derived: tile filenames split into 3×3 grid (row-major)
    func tileFilename(at index: Int) -> String {
        "\(filename)_tile_\(index)"  // pre-sliced at build time
    }
}

struct ImageTile: Identifiable {
    let id: Int              // 0–8, row-major
    let row: Int             // 0–2
    let col: Int             // 0–2
    let image: UIImage
    var isVisible: Bool
}

// MARK: - Pack & Theme

struct Pack: Identifiable, Codable {
    let id: String
    let themeID: String
    let title: String
    let description: String
    let coverImageID: String
    let puzzleIDs: [String]
    var isUnlocked: Bool

    var totalCount: Int { puzzleIDs.count }
}

struct Theme: Identifiable, Codable {
    let id: String
    let title: String           // "Nature", "Cities", etc.
    let iconName: String        // SF Symbol name
    let packIDs: [String]
}

// MARK: - CreditWallet

struct CreditWallet: Codable {
    var balance: Int
    var lifetimeEarned: Int
    var transactions: [CreditTransaction]

    struct CreditTransaction: Codable, Identifiable {
        let id: UUID
        let delta: Int           // positive = earned, negative = spent
        let reason: Reason
        let date: Date

        enum Reason: String, Codable {
            case puzzleCompletion
            case streakBonus
            case hintUsed
            case autoFillNotes
            case cosmeticPurchase
        }
    }

    var canAfford: (Int) -> Bool {{ self.balance >= $0 }}
}
```

---

## 3. Storage Strategy

### Choice: GRDB (SQLite wrapper)

**Why not Core Data?** Core Data's complexity isn't justified here. GRDB gives us:
- Type-safe SQL with Swift value types
- WAL mode for concurrent reads
- Excellent performance on indexed queries
- Simple migration path

**Why not plain JSON?** 1,000+ puzzles per difficulty = 4,000 records. JSON loads everything into memory. SQLite lets us fetch exactly what we need.

### Schema

```sql
-- Puzzles table (seeded from bundle JSON at first launch)
CREATE TABLE puzzles (
    id          TEXT PRIMARY KEY,
    difficulty  TEXT NOT NULL,
    pack_id     TEXT NOT NULL,
    image_id    TEXT NOT NULL,
    given       TEXT NOT NULL,   -- JSON array [81 ints]
    solution    TEXT NOT NULL    -- JSON array [81 ints]
);
CREATE INDEX idx_puzzles_pack ON puzzles(pack_id);
CREATE INDEX idx_puzzles_difficulty ON puzzles(difficulty);

-- Puzzle state (one row per puzzle the user has touched)
CREATE TABLE puzzle_states (
    puzzle_id       TEXT PRIMARY KEY,
    board           TEXT NOT NULL,   -- JSON [81 ints]
    notes           TEXT NOT NULL,   -- JSON [[ints]]
    undo_stack      TEXT NOT NULL,
    hints_used      INTEGER DEFAULT 0,
    is_completed    INTEGER DEFAULT 0,
    elapsed_seconds INTEGER DEFAULT 0,
    started_at      TEXT NOT NULL
);

-- User progress
CREATE TABLE user_progress (
    id                  INTEGER PRIMARY KEY DEFAULT 1,
    completed_ids       TEXT NOT NULL DEFAULT '[]',
    streak_days         INTEGER DEFAULT 0,
    last_played_date    TEXT,
    unlocked_pack_ids   TEXT NOT NULL DEFAULT '[]'
);

-- Credit wallet
CREATE TABLE credit_wallet (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    balance         INTEGER DEFAULT 0,
    lifetime_earned INTEGER DEFAULT 0
);

CREATE TABLE credit_transactions (
    id      TEXT PRIMARY KEY,
    delta   INTEGER NOT NULL,
    reason  TEXT NOT NULL,
    date    TEXT NOT NULL
);

-- Image reveal state
CREATE TABLE image_reveal_state (
    image_id    TEXT PRIMARY KEY,
    is_revealed INTEGER DEFAULT 0
);

-- Packs & themes (seeded from bundle)
CREATE TABLE themes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    icon_name   TEXT NOT NULL
);

CREATE TABLE packs (
    id          TEXT PRIMARY KEY,
    theme_id    TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_image_id TEXT NOT NULL,
    is_unlocked INTEGER DEFAULT 0,
    FOREIGN KEY(theme_id) REFERENCES themes(id)
);
```

### Seeding Strategy

At first launch:

```swift
func seedDatabaseIfNeeded(db: DatabaseQueue) throws {
    let alreadySeeded = try db.read { db in
        try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM puzzles") ?? 0
    }
    guard alreadySeeded == 0 else { return }

    // Load from bundle — split by difficulty for memory efficiency
    for difficulty in Puzzle.Difficulty.allCases {
        let url = Bundle.main.url(
            forResource: "puzzles_\(difficulty.rawValue)",
            withExtension: "json"
        )!
        let data = try Data(contentsOf: url)
        let puzzles = try JSONDecoder().decode([Puzzle].self, from: data)

        try db.write { db in
            for puzzle in puzzles {
                try db.execute(
                    sql: """
                    INSERT OR IGNORE INTO puzzles
                    (id, difficulty, pack_id, image_id, given, solution)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    arguments: [
                        puzzle.id, puzzle.difficulty.rawValue,
                        puzzle.packID, puzzle.imageID,
                        try JSONEncoder().encode(puzzle.given).base64EncodedString(),
                        try JSONEncoder().encode(puzzle.solution).base64EncodedString()
                    ]
                )
            }
        }
    }
}
```

### Fetching Strategy

Never load all puzzles at once. Fetch one puzzle at a time for gameplay; fetch pack summaries (count + completion) for list views.

```swift
// Efficient: fetch next unplayed puzzle in a pack
func nextPuzzle(inPack packID: String) throws -> Puzzle? {
    try db.read { db in
        // LEFT JOIN to exclude completed puzzles
        let row = try Row.fetchOne(db, sql: """
            SELECT p.* FROM puzzles p
            LEFT JOIN puzzle_states ps ON p.id = ps.puzzle_id
            WHERE p.pack_id = ?
            AND (ps.is_completed IS NULL OR ps.is_completed = 0)
            ORDER BY p.id
            LIMIT 1
        """, arguments: [packID])
        return row.map { Puzzle(row: $0) }
    }
}
```

---

## 4. Sudoku Engine

The engine is a pure value-type Swift struct — no SwiftUI dependencies, fully testable.

```swift
// MARK: - SudokuBoard

struct SudokuBoard {
    // MARK: State
    private(set) var cells: [Int]        // 81 values; 0 = empty
    private(set) var notes: [[Set<Int>]] // 81 × pencil marks
    private(set) var given: [Int]        // immutable givens mask
    private var undoStack: [UndoAction] = []

    // MARK: Init
    init(given: [Int]) {
        precondition(given.count == 81)
        self.given = given
        self.cells = given
        self.notes = Array(repeating: Set<Int>(), count: 81)
    }

    // MARK: Indexing
    static func index(row: Int, col: Int) -> Int { row * 9 + col }
    static func row(of index: Int) -> Int { index / 9 }
    static func col(of index: Int) -> Int { index % 9 }
    static func box(of index: Int) -> Int { (index / 9 / 3) * 3 + (index % 9 / 3) }

    // MARK: Cell Access
    func value(at index: Int) -> Int { cells[index] }
    func isGiven(at index: Int) -> Bool { given[index] != 0 }
    func notesAt(_ index: Int) -> Set<Int> { notes[index] }

    // MARK: Mutations
    mutating func place(_ digit: Int, at index: Int) {
        guard !isGiven(at: index) else { return }
        guard (0...9).contains(digit) else { return }

        let prev = cells[index]
        let prevNotes = notes[index]

        undoStack.append(UndoAction(index: index, previousValue: prev, previousNotes: prevNotes))

        cells[index] = digit
        if digit != 0 {
            notes[index] = []            // placing clears notes on that cell
        }
    }

    mutating func toggleNote(_ digit: Int, at index: Int) {
        guard !isGiven(at: index), cells[index] == 0 else { return }

        let prev = cells[index]
        let prevNotes = notes[index]
        undoStack.append(UndoAction(index: index, previousValue: prev, previousNotes: prevNotes))

        if notes[index].contains(digit) {
            notes[index].remove(digit)
        } else {
            notes[index].insert(digit)
        }
    }

    mutating func erase(at index: Int) {
        guard !isGiven(at: index) else { return }
        place(0, at: index)
        notes[index] = []
    }

    mutating func undo() {
        guard let action = undoStack.popLast() else { return }
        cells[action.index] = action.previousValue
        notes[action.index] = action.previousNotes
    }

    // MARK: Validation

    /// Returns set of indices that conflict with the given index
    func conflicts(at index: Int) -> Set<Int> {
        let digit = cells[index]
        guard digit != 0 else { return [] }

        var conflicting = Set<Int>()
        for peer in peers(of: index) {
            if cells[peer] == digit {
                conflicting.insert(peer)
                conflicting.insert(index)
            }
        }
        return conflicting
    }

    func isMistake(at index: Int, solution: [Int]) -> Bool {
        let v = cells[index]
        return v != 0 && v != solution[index]
    }

    /// All indices sharing a row, column, or box
    func peers(of index: Int) -> Set<Int> {
        let r = Self.row(of: index)
        let c = Self.col(of: index)
        let b = Self.box(of: index)
        var result = Set<Int>()
        for i in 0..<81 {
            if i != index {
                if Self.row(of: i) == r || Self.col(of: i) == c || Self.box(of: i) == b {
                    result.insert(i)
                }
            }
        }
        return result
    }

    /// Indices with the same digit as the selected cell
    func sameValueIndices(as index: Int) -> Set<Int> {
        let digit = cells[index]
        guard digit != 0 else { return [] }
        return Set((0..<81).filter { cells[$0] == digit })
    }

    // MARK: Completion

    var isComplete: Bool {
        !cells.contains(0) && allConflicts.isEmpty
    }

    var allConflicts: Set<Int> {
        var result = Set<Int>()
        for i in 0..<81 where cells[i] != 0 {
            result.formUnion(conflicts(at: i))
        }
        return result
    }

    // MARK: Hint

    /// Returns index of a cell to fill, preferring cells with fewest candidates
    func hintIndex(solution: [Int]) -> Int? {
        (0..<81)
            .filter { cells[$0] == 0 && !isGiven(at: $0) }
            .min(by: { candidateCount(at: $0) < candidateCount(at: $1) })
    }

    func candidateCount(at index: Int) -> Int {
        let peerValues = Set(peers(of: index).map { cells[$0] })
        return (1...9).filter { !peerValues.contains($0) }.count
    }

    // MARK: Auto-fill Notes
    mutating func autoFillAllNotes() {
        for i in 0..<81 where cells[i] == 0 {
            let peerValues = Set(peers(of: i).map { cells[$0] })
            notes[i] = Set((1...9).filter { !peerValues.contains($0) })
        }
    }

    // MARK: Undo Support
    struct UndoAction: Codable {
        let index: Int
        let previousValue: Int
        let previousNotes: Set<Int>
    }
}
```

---

## 5. UI Structure

### Screen Map

```
App Launch
    │
    ▼
HomeView
    ├─► PackSelectionView
    │       └─► PuzzleView ──► CompletionView
    ├─► GalleryView
    └─► SettingsView
```

### Navigation (Coordinator)

```swift
@MainActor
final class AppCoordinator: ObservableObject {
    enum Route: Hashable {
        case packSelection(Theme)
        case puzzle(Puzzle)
        case completion(Puzzle, PuzzleState)
        case gallery(Pack)
        case settings
    }

    @Published var path = NavigationPath()

    func push(_ route: Route) { path.append(route) }
    func pop() { path.removeLast() }
    func popToRoot() { path.removeLast(path.count) }
}

struct AppRootView: View {
    @StateObject private var coordinator = AppCoordinator()

    var body: some View {
        NavigationStack(path: $coordinator.path) {
            HomeView()
                .navigationDestination(for: AppCoordinator.Route.self) { route in
                    switch route {
                    case .packSelection(let theme):
                        PackSelectionView(theme: theme)
                    case .puzzle(let puzzle):
                        PuzzleView(puzzle: puzzle)
                    case .completion(let puzzle, let state):
                        CompletionView(puzzle: puzzle, state: state)
                    case .gallery(let pack):
                        GalleryView(pack: pack)
                    case .settings:
                        SettingsView()
                    }
                }
        }
        .environmentObject(coordinator)
    }
}
```

### View Responsibilities

| View | Key Responsibilities |
|---|---|
| `HomeView` | Theme grid, streak display, credit balance, quick-resume |
| `PackSelectionView` | Pack list for a theme, progress bars, lock state |
| `PuzzleView` | Board grid, number pad, toolbar (undo/erase/hint/notes) |
| `CompletionView` | Time, stats, image reveal animation, credit award |
| `GalleryView` | Grid of revealed images for a pack |
| `SettingsView` | Difficulty default, mistake checking, high contrast, about |

---

## 6. Puzzle View UX

### PuzzleViewModel

```swift
@MainActor
final class PuzzleViewModel: ObservableObject {
    // MARK: Published State
    @Published private(set) var board: SudokuBoard
    @Published private(set) var selectedIndex: Int? = nil
    @Published private(set) var isNotesMode: Bool = false
    @Published private(set) var isMistakeCheckEnabled: Bool
    @Published private(set) var elapsedSeconds: Int = 0
    @Published private(set) var isComplete: Bool = false
    @Published private(set) var conflictIndices: Set<Int> = []
    @Published private(set) var highlightedIndices: Set<Int> = []

    private let puzzle: Puzzle
    private let progressService: ProgressService
    private let creditService: CreditService
    private var timer: Timer?

    init(puzzle: Puzzle,
         savedState: PuzzleState?,
         progressService: ProgressService,
         creditService: CreditService) {
        self.puzzle = puzzle
        self.progressService = progressService
        self.creditService = creditService
        self.isMistakeCheckEnabled = UserDefaults.standard.bool(forKey: "mistakeCheck")

        if let saved = savedState {
            self.board = SudokuBoard(restoring: saved)
            self.elapsedSeconds = saved.elapsedSeconds
        } else {
            self.board = SudokuBoard(given: puzzle.given)
        }
    }

    // MARK: Interactions

    func select(_ index: Int) {
        if selectedIndex == index {
            selectedIndex = nil
            highlightedIndices = []
            return
        }
        selectedIndex = index
        updateHighlights(for: index)
    }

    func inputDigit(_ digit: Int) {
        guard let idx = selectedIndex, !board.isGiven(at: idx) else { return }

        if isNotesMode {
            board.toggleNote(digit, at: idx)
        } else {
            board.place(digit, at: idx)
            if isMistakeCheckEnabled {
                conflictIndices = board.allConflicts
            }
            if board.isComplete { handleCompletion() }
        }
        updateHighlights(for: idx)
        autosave()
    }

    func erase() {
        guard let idx = selectedIndex else { return }
        board.erase(at: idx)
        if isMistakeCheckEnabled { conflictIndices = board.allConflicts }
        autosave()
    }

    func undo() {
        board.undo()
        if isMistakeCheckEnabled { conflictIndices = board.allConflicts }
        if let idx = selectedIndex { updateHighlights(for: idx) }
        autosave()
    }

    func toggleNotesMode() { isNotesMode.toggle() }

    func useHint() {
        guard creditService.canAfford(10) else { return }
        guard let idx = board.hintIndex(solution: puzzle.solution) else { return }
        creditService.spend(10, reason: .hintUsed)
        board.place(puzzle.solution[idx], at: idx)
        selectedIndex = idx
        updateHighlights(for: idx)
        if board.isComplete { handleCompletion() }
        autosave()
    }

    func useAutoFillNotes() {
        guard creditService.canAfford(20) else { return }
        creditService.spend(20, reason: .autoFillNotes)
        board.autoFillAllNotes()
        autosave()
    }

    // MARK: Private Helpers

    private func updateHighlights(for index: Int) {
        var h = board.peers(of: index)  // same row/col/box
        h.formUnion(board.sameValueIndices(as: index))
        h.insert(index)
        highlightedIndices = h
    }

    private func handleCompletion() {
        isComplete = true
        stopTimer()
        Task {
            await progressService.markCompleted(puzzleID: puzzle.id)
            await creditService.award(for: .puzzleCompletion)
        }
    }

    private func autosave() {
        Task {
            let state = PuzzleState(from: board, puzzleID: puzzle.id, elapsed: elapsedSeconds)
            await progressService.saveState(state)
        }
    }

    // MARK: Timer
    func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.elapsedSeconds += 1 }
        }
    }
    func stopTimer() { timer?.invalidate(); timer = nil }
}
```

### Touch Interaction Flow

```
User taps cell[i]
    → PuzzleViewModel.select(i)
    → selectedIndex = i
    → highlightedIndices = peers(i) ∪ sameValue(i) ∪ {i}
    → View redraws: selected cell = accent color, highlights = soft tint

User taps digit "5" on numpad
    → inputDigit(5)
    → if notesMode: toggleNote(5, at: i)
    → else: place(5, at: i), check completion, re-validate conflicts
    → autosave()

User taps "undo"
    → board.undo() pops last UndoAction, restores prior state
    → conflicts re-evaluated
```

### PuzzleView Layout

```
┌─────────────────────────────────┐
│  ← Back    00:03:42    ⚡ 240  │  ← Toolbar (time + credits)
├─────────────────────────────────┤
│                                 │
│   ┌─────────────────────────┐  │
│   │   9×9 Sudoku Grid       │  │  ← SudokuGridView
│   │   (square, fills width) │  │
│   └─────────────────────────┘  │
│                                 │
│   [ Erase ][ Notes: OFF ]      │
│   [ Undo  ][ Hint 🔑10  ]      │  ← Action buttons
│                                 │
│   ┌─────────────────────────┐  │
│   │  1  2  3  4  5  6  7  8  9│  ← NumberPadView
│   └─────────────────────────┘  │
└─────────────────────────────────┘
```

---

## 7. Image Reveal System

### Storage

Images are **pre-sliced at build time** into 9 tiles (3×3 grid) using a Python script in the build pipeline. Each tile is stored as a separate PNG in the asset catalog.

```
Assets.xcassets/
  ImagePacks/
    nature_pack1/
      forest_sunrise/
        tile_0.imageset   (top-left)
        tile_1.imageset   (top-center)
        ...
        tile_8.imageset   (bottom-right)
```

This approach:
- Avoids runtime slicing (no CGImage cropping on the main thread)
- Allows lazy loading (only load tiles as they're needed)
- Works entirely offline

### Tile Mapping

```swift
struct ImageTileService {
    /// Returns UIImage for a specific tile (0–8, row-major)
    func tile(for imageID: String, index: Int) -> UIImage? {
        UIImage(named: "ImagePacks/\(imageID)/tile_\(index)")
    }

    /// All 9 tiles for an image
    func allTiles(for imageID: String) -> [UIImage?] {
        (0..<9).map { tile(for: imageID, index: $0) }
    }
}
```

### Reveal Animation

```swift
struct ImageRevealView: View {
    let imageID: String
    let revealedTiles: Set<Int>   // grows from 0 to 9 after completion
    @State private var animatedTiles: Set<Int> = []

    var body: some View {
        LazyVGrid(columns: Array(repeating: .init(.flexible(), spacing: 2), count: 3), spacing: 2) {
            ForEach(0..<9, id: \.self) { index in
                TileView(imageID: imageID, index: index)
                    .opacity(animatedTiles.contains(index) ? 1 : 0)
                    .scaleEffect(animatedTiles.contains(index) ? 1 : 0.85)
                    .animation(
                        .spring(response: 0.45, dampingFraction: 0.7)
                        .delay(Double(index) * 0.08),
                        value: animatedTiles
                    )
            }
        }
        .onAppear { revealSequentially() }
    }

    private func revealSequentially() {
        for index in 0..<9 {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.1) {
                animatedTiles.insert(index)
            }
        }
    }
}

struct TileView: View {
    let imageID: String
    let index: Int
    @State private var image: UIImage? = nil

    var body: some View {
        Group {
            if let img = image {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
            } else {
                Color.gray.opacity(0.2)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipped()
        .task {
            image = AppContainer.shared.imageTileService.tile(for: imageID, index: index)
        }
    }
}
```

### Memory Considerations

- Tiles are loaded on demand inside `.task {}` — no preloading all 9 at once
- `UIImage(named:)` uses the system's image cache automatically
- Images are loaded at display resolution only (no full-res decode for thumbnails)
- In `GalleryView`, use `LazyVGrid` so off-screen tiles aren't decoded

---

## 8. Progression System

```swift
protocol ProgressService {
    func markCompleted(puzzleID: String) async
    func saveState(_ state: PuzzleState) async
    func loadState(for puzzleID: String) async -> PuzzleState?
    func packProgress(packID: String) async -> PackProgress
    func userProgress() async -> UserProgress
}

struct PackProgress {
    let packID: String
    let totalCount: Int
    let completedCount: Int
    var fraction: Double { Double(completedCount) / Double(totalCount) }
    var isFullyCompleted: Bool { completedCount == totalCount }
}

final class ProgressServiceImpl: ProgressService {
    private let db: DatabaseQueue

    func markCompleted(puzzleID: String) async {
        await db.write { db in
            try db.execute(sql: """
                UPDATE puzzle_states
                SET is_completed = 1
                WHERE puzzle_id = ?
            """, arguments: [puzzleID])

            // Update streak
            let progress = try self.fetchProgress(db)
            let today = Calendar.current.startOfDay(for: Date())
            let wasYesterday = progress.lastPlayedDate.map {
                Calendar.current.isDate($0, inSameDayAs: today.addingTimeInterval(-86400))
            } ?? false

            let newStreak = wasYesterday ? progress.streakDays + 1 : 1
            try db.execute(sql: """
                UPDATE user_progress
                SET streak_days = ?,
                    last_played_date = ?
            """, arguments: [newStreak, ISO8601DateFormatter().string(from: today)])

            // Reveal the image associated with this puzzle
            let row = try Row.fetchOne(db, sql:
                "SELECT image_id FROM puzzles WHERE id = ?",
                arguments: [puzzleID]
            )
            if let imageID = row?["image_id"] as? String {
                try db.execute(sql: """
                    INSERT OR REPLACE INTO image_reveal_state (image_id, is_revealed)
                    VALUES (?, 1)
                """, arguments: [imageID])
            }
        }
    }
}
```

### Unlock Logic

Packs unlock automatically when the previous pack in a theme reaches 50% completion. This is checked in `PackSelectionViewModel` when the view appears:

```swift
func refreshUnlockStatus() async {
    let packs = await progressService.allPacksWithProgress(themeID: theme.id)
    for (i, pack) in packs.enumerated() where i > 0 {
        let previous = packs[i - 1]
        if previous.progress.fraction >= 0.5 && !pack.pack.isUnlocked {
            await progressService.unlock(packID: pack.pack.id)
        }
    }
}
```

---

## 9. Credit System

```swift
protocol CreditService {
    func balance() async -> Int
    func canAfford(_ amount: Int) async -> Bool
    func award(for reason: CreditTransaction.Reason) async
    func spend(_ amount: Int, reason: CreditTransaction.Reason) async
}

/// Earning rates
extension CreditService {
    static let puzzleCompletionReward = 50
    static let streakBonusReward = 25   // per day of streak
    static let hintCost = 10
    static let autoFillNotesCost = 20
}

final class CreditServiceImpl: CreditService {
    private let db: DatabaseQueue

    func award(for reason: CreditTransaction.Reason) async {
        let amount: Int
        switch reason {
        case .puzzleCompletion: amount = CreditService.puzzleCompletionReward
        case .streakBonus:      amount = CreditService.streakBonusReward
        default:                amount = 0
        }
        guard amount > 0 else { return }

        await db.write { db in
            try db.execute(sql: """
                UPDATE credit_wallet
                SET balance = balance + ?,
                    lifetime_earned = lifetime_earned + ?
            """, arguments: [amount, amount])

            try db.execute(sql: """
                INSERT INTO credit_transactions (id, delta, reason, date)
                VALUES (?, ?, ?, ?)
            """, arguments: [UUID().uuidString, amount, reason.rawValue,
                             ISO8601DateFormatter().string(from: Date())])
        }
    }

    func spend(_ amount: Int, reason: CreditTransaction.Reason) async {
        await db.write { db in
            try db.execute(sql: """
                UPDATE credit_wallet SET balance = balance - ?
                WHERE balance >= ?
            """, arguments: [amount, amount])

            try db.execute(sql: """
                INSERT INTO credit_transactions (id, delta, reason, date)
                VALUES (?, ?, ?, ?)
            """, arguments: [UUID().uuidString, -amount, reason.rawValue,
                             ISO8601DateFormatter().string(from: Date())])
        }
    }
}
```

---

## 10. Accessibility

### VoiceOver Labels

```swift
// SudokuCellView — each cell gets a rich accessibility description
struct SudokuCellView: View {
    let index: Int
    let value: Int
    let notes: Set<Int>
    let isGiven: Bool
    let isSelected: Bool
    let isHighlighted: Bool
    let isConflicting: Bool

    var body: some View {
        cellContent
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilityLabel)
            .accessibilityHint(isGiven ? "Given clue, cannot be changed" : "Double-tap to select")
            .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var accessibilityLabel: String {
        let position = "Row \(SudokuBoard.row(of: index) + 1), column \(SudokuBoard.col(of: index) + 1)"
        if value != 0 {
            let type = isGiven ? "Given" : "Placed"
            let error = isConflicting ? ", conflicting" : ""
            return "\(position). \(type) \(value)\(error)."
        } else if !notes.isEmpty {
            let noteList = notes.sorted().map(String.init).joined(separator: ", ")
            return "\(position). Notes: \(noteList)."
        } else {
            return "\(position). Empty."
        }
    }
}

// NumberPad — each button labeled clearly
NumberPadButton(digit: 5)
    .accessibilityLabel("Place 5")

EraseButton()
    .accessibilityLabel("Erase selected cell")

NotesModeToggle(isOn: isNotesMode)
    .accessibilityLabel(isNotesMode ? "Notes mode on" : "Notes mode off")
    .accessibilityHint("Toggle pencil marks mode")
```

### High Contrast Mode

```swift
extension Color {
    static func cellBackground(isSelected: Bool, isHighlighted: Bool,
                               isGiven: Bool, colorScheme: ColorScheme,
                               isHighContrast: Bool) -> Color {
        if isHighContrast {
            if isSelected { return .yellow }
            if isHighlighted { return colorScheme == .dark ? .white.opacity(0.2) : .black.opacity(0.15) }
            return colorScheme == .dark ? .black : .white
        } else {
            if isSelected { return Color.accentColor.opacity(0.3) }
            if isHighlighted { return Color.accentColor.opacity(0.1) }
            return colorScheme == .dark ? Color(white: 0.15) : .white
        }
    }
}

// Detect via UIAccessibility
@Environment(\.accessibilityDifferentiateWithoutColor) var differentiateWithoutColor
@AppStorage("highContrast") var highContrastEnabled = false
var useHighContrast: Bool { highContrastEnabled || differentiateWithoutColor }
```

### Dynamic Type

All text uses `Font.system(.body)` or semantic sizes — never fixed pt sizes.  
Grid cell size adapts to available width (GeometryReader), not text size.

---

## 11. Offline Support

Everything that runs the game is local:

| Component | Local Source |
|---|---|
| Puzzles | Bundled JSON → SQLite on first launch |
| Images/Tiles | Asset catalog (compiled into app binary) |
| User progress | SQLite in Documents directory |
| Credit wallet | SQLite in Documents directory |
| Settings | UserDefaults |

**Future pack delivery** (without backend dependency):

Option A — App update: new puzzle JSON + image assets shipped in the next app version.

Option B — On-demand resources (Apple's ODR): pack assets are hosted on Apple's CDN, downloaded when a user unlocks a pack. This keeps the initial download small while remaining "no backend" from our perspective.

```swift
// ODR sketch for future packs
func downloadPackIfNeeded(packID: String) async throws {
    let request = NSBundleResourceRequest(tags: [packID])
    request.loadingPriority = NSBundleResourceRequestLoadingPriorityUrgent
    try await request.beginAccessingResources()
    // Assets are now available in the bundle
}
```

---

## 12. Sample Implementation

### Complete PuzzleView (working SwiftUI)

```swift
import SwiftUI

struct PuzzleView: View {
    @StateObject private var vm: PuzzleViewModel
    @EnvironmentObject private var coordinator: AppCoordinator

    init(puzzle: Puzzle) {
        let container = AppContainer.shared
        let savedState = try? container.progressService.loadStateSync(for: puzzle.id)
        _vm = StateObject(wrappedValue: PuzzleViewModel(
            puzzle: puzzle,
            savedState: savedState,
            progressService: container.progressService,
            creditService: container.creditService
        ))
    }

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                TimerBar(elapsed: vm.elapsedSeconds)
                    .padding(.horizontal)
                    .padding(.top, 8)

                Spacer(minLength: 12)

                SudokuGridView(vm: vm)
                    .frame(width: geo.size.width, height: geo.size.width)
                    .padding(.horizontal, 12)

                Spacer(minLength: 16)

                ActionBar(vm: vm)
                    .padding(.horizontal, 16)

                Spacer(minLength: 12)

                NumberPadView(vm: vm)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { vm.startTimer() }
        .onDisappear { vm.stopTimer() }
        .onChange(of: vm.isComplete) { complete in
            if complete {
                coordinator.push(.completion(vm.puzzle, vm.currentState))
            }
        }
    }
}

// MARK: - Grid

struct SudokuGridView: View {
    @ObservedObject var vm: PuzzleViewModel

    var body: some View {
        Canvas { context, size in
            // Draw grid lines via Canvas for performance
            drawGridLines(context: context, size: size)
        }
        .overlay(cellsOverlay)
    }

    private var cellsOverlay: some View {
        GeometryReader { geo in
            let cellSize = geo.size.width / 9
            ForEach(0..<81, id: \.self) { index in
                let row = index / 9
                let col = index % 9
                SudokuCellView(
                    index: index,
                    value: vm.board.value(at: index),
                    notes: vm.board.notesAt(index),
                    isGiven: vm.board.isGiven(at: index),
                    isSelected: vm.selectedIndex == index,
                    isHighlighted: vm.highlightedIndices.contains(index),
                    isConflicting: vm.conflictIndices.contains(index)
                )
                .frame(width: cellSize, height: cellSize)
                .position(
                    x: CGFloat(col) * cellSize + cellSize / 2,
                    y: CGFloat(row) * cellSize + cellSize / 2
                )
                .onTapGesture { vm.select(index) }
            }
        }
    }

    private func drawGridLines(context: GraphicsContext, size: CGSize) {
        let cellSize = size.width / 9
        var thinPath = Path()
        var thickPath = Path()

        for i in 0...9 {
            let pos = CGFloat(i) * cellSize
            let isBox = i % 3 == 0
            // Horizontal
            (isBox ? thickPath : thinPath).move(to: CGPoint(x: 0, y: pos))
            (isBox ? thickPath : thinPath).addLine(to: CGPoint(x: size.width, y: pos))
            // Vertical
            (isBox ? thickPath : thinPath).move(to: CGPoint(x: pos, y: 0))
            (isBox ? thickPath : thinPath).addLine(to: CGPoint(x: pos, y: size.height))
        }

        context.stroke(thinPath, with: .color(.gray.opacity(0.3)), lineWidth: 0.5)
        context.stroke(thickPath, with: .color(.primary.opacity(0.7)), lineWidth: 2)
    }
}

// MARK: - Cell

struct SudokuCellView: View {
    let index: Int
    let value: Int
    let notes: Set<Int>
    let isGiven: Bool
    let isSelected: Bool
    let isHighlighted: Bool
    let isConflicting: Bool

    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        ZStack {
            background
            if value != 0 {
                Text("\(value)")
                    .font(.system(size: 20, weight: isGiven ? .bold : .regular, design: .rounded))
                    .foregroundColor(textColor)
            } else if !notes.isEmpty {
                NotesGrid(notes: notes)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(a11yLabel)
    }

    private var background: some View {
        Rectangle()
            .fill(backgroundColor)
            .animation(.easeInOut(duration: 0.1), value: isSelected)
    }

    private var backgroundColor: Color {
        if isSelected { return Color.accentColor.opacity(0.35) }
        if isConflicting { return Color.red.opacity(0.2) }
        if isHighlighted { return Color.accentColor.opacity(0.12) }
        return Color.clear
    }

    private var textColor: Color {
        if isConflicting { return .red }
        if isGiven { return .primary }
        return .accentColor
    }

    private var a11yLabel: String {
        let r = SudokuBoard.row(of: index) + 1
        let c = SudokuBoard.col(of: index) + 1
        if value != 0 {
            return "Row \(r), column \(c). \(isGiven ? "Given" : "Placed") \(value)\(isConflicting ? ", conflicting" : "")."
        } else if !notes.isEmpty {
            return "Row \(r), column \(c). Notes: \(notes.sorted().map(String.init).joined(separator: ", "))."
        }
        return "Row \(r), column \(c). Empty."
    }
}

struct NotesGrid: View {
    let notes: Set<Int>

    var body: some View {
        LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 3), spacing: 0) {
            ForEach(1...9, id: \.self) { n in
                Text(notes.contains(n) ? "\(n)" : " ")
                    .font(.system(size: 7, weight: .light))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .padding(2)
    }
}

// MARK: - Number Pad

struct NumberPadView: View {
    @ObservedObject var vm: PuzzleViewModel

    var body: some View {
        HStack(spacing: 8) {
            ForEach(1...9, id: \.self) { digit in
                Button {
                    vm.inputDigit(digit)
                } label: {
                    Text("\(digit)")
                        .font(.system(size: 24, weight: .medium, design: .rounded))
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(10)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Place \(digit)")
            }
        }
    }
}

// MARK: - Action Bar

struct ActionBar: View {
    @ObservedObject var vm: PuzzleViewModel

    var body: some View {
        HStack(spacing: 16) {
            ActionButton(icon: "arrow.uturn.backward", label: "Undo") { vm.undo() }
            ActionButton(icon: "eraser", label: "Erase") { vm.erase() }
            ActionButton(
                icon: vm.isNotesMode ? "pencil.circle.fill" : "pencil.circle",
                label: vm.isNotesMode ? "Notes On" : "Notes Off",
                isActive: vm.isNotesMode
            ) { vm.toggleNotesMode() }
            ActionButton(icon: "lightbulb", label: "Hint (10)") { vm.useHint() }
        }
    }
}

struct ActionButton: View {
    let icon: String
    let label: String
    var isActive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 22))
                Text(label)
                    .font(.caption2)
            }
            .foregroundColor(isActive ? .accentColor : .secondary)
            .frame(maxWidth: .infinity)
        }
        .accessibilityLabel(label)
    }
}
```

---

## 13. File Structure

```
SudokuReveal/
├── App/
│   ├── SudokuRevealApp.swift        # @main, AppContainer init, DB seeding
│   └── AppCoordinator.swift
│
├── Core/
│   ├── Models/
│   │   ├── Puzzle.swift
│   │   ├── PuzzleState.swift
│   │   ├── UserProgress.swift
│   │   ├── ImageAsset.swift
│   │   ├── Pack.swift
│   │   ├── Theme.swift
│   │   └── CreditWallet.swift
│   ├── Engine/
│   │   └── SudokuBoard.swift        # Pure logic, zero UI imports
│   └── Database/
│       ├── DatabaseQueue+Setup.swift
│       └── Seeder.swift
│
├── Services/
│   ├── Protocols/
│   │   ├── PuzzleRepository.swift
│   │   ├── ProgressService.swift
│   │   ├── CreditService.swift
│   │   └── ImageTileService.swift
│   └── Implementations/
│       ├── PuzzleRepositoryImpl.swift
│       ├── ProgressServiceImpl.swift
│       ├── CreditServiceImpl.swift
│       └── ImageTileServiceImpl.swift
│
├── Features/
│   ├── Home/
│   │   ├── HomeView.swift
│   │   └── HomeViewModel.swift
│   ├── PackSelection/
│   │   ├── PackSelectionView.swift
│   │   └── PackSelectionViewModel.swift
│   ├── Puzzle/
│   │   ├── PuzzleView.swift
│   │   ├── PuzzleViewModel.swift
│   │   ├── SudokuGridView.swift
│   │   ├── SudokuCellView.swift
│   │   ├── NumberPadView.swift
│   │   └── ActionBar.swift
│   ├── Completion/
│   │   ├── CompletionView.swift
│   │   └── ImageRevealView.swift
│   ├── Gallery/
│   │   ├── GalleryView.swift
│   │   └── GalleryViewModel.swift
│   └── Settings/
│       └── SettingsView.swift
│
├── Shared/
│   ├── Components/
│   │   ├── TimerBar.swift
│   │   ├── ProgressBar.swift
│   │   ├── CreditBadge.swift
│   │   └── PackCard.swift
│   ├── Extensions/
│   │   ├── Color+Theme.swift
│   │   └── View+Accessibility.swift
│   └── Constants.swift
│
└── Resources/
    ├── Puzzles/
    │   ├── puzzles_easy.json        # ~1,000 puzzles
    │   ├── puzzles_medium.json
    │   ├── puzzles_hard.json
    │   └── puzzles_insane.json
    ├── Content/
    │   ├── themes.json
    │   └── packs.json
    └── Assets.xcassets/
        └── ImagePacks/
            ├── nature_pack1/
            │   └── forest_sunrise/
            │       ├── tile_0.imageset
            │       └── ...
            └── ...

Tests/
├── SudokuBoardTests.swift
├── CreditServiceTests.swift
├── ProgressServiceTests.swift
└── PuzzleRepositoryTests.swift
```

---

## 14. Performance Considerations

### Zero Input Lag

- `SudokuBoard` is a value type — mutations copy on write, no heap allocation per keystroke
- `SudokuCellView` uses `Canvas` for grid lines (one draw call vs 81 views)
- Cell views use `.animation(.easeInOut(duration: 0.1), value: isSelected)` — implicit animation keyed to state, not timers
- `NumberPadView` buttons are `.buttonStyle(.plain)` — avoids SwiftUI's default highlight delay

### Memory

- Images: tiles loaded lazily inside `.task {}`, released by system under pressure
- Puzzles: one puzzle in memory at a time — `SudokuBoard` is <1KB
- Notes: `Set<Int>` is extremely compact (9 bits of meaningful data per cell)
- Undo stack: capped at 200 entries; older entries dropped silently

```swift
private let maxUndoDepth = 200
mutating func pushUndo(_ action: UndoAction) {
    undoStack.append(action)
    if undoStack.count > maxUndoDepth {
        undoStack.removeFirst()
    }
}
```

### Rendering

- `SudokuGridView` redraws only when `@ObservedObject` publishes changes — SwiftUI's diffing handles the rest
- Grid lines drawn in `Canvas` (GPU path rendering, not 81 `Rectangle` views)
- `ImageRevealView` tiles use `LazyVGrid` — off-screen tiles not rendered
- Avoid `GeometryReader` inside `ForEach`; compute cell size once at the grid level

### Database

- All DB access is async (`await db.write/read`) — never blocks main thread
- Autosave is debounced (500ms) to avoid writes per-keystroke

```swift
private var autosaveTask: Task<Void, Never>?
private func autosave() {
    autosaveTask?.cancel()
    autosaveTask = Task {
        try? await Task.sleep(for: .milliseconds(500))
        guard !Task.isCancelled else { return }
        let state = currentState
        await progressService.saveState(state)
    }
}
```

---

## 15. Testing Strategy

### Unit Tests — Sudoku Engine (highest priority)

```swift
final class SudokuBoardTests: XCTestCase {

    func testPlacingDigitUpdatesBoard() {
        var board = SudokuBoard(given: emptyGrid())
        board.place(5, at: 0)
        XCTAssertEqual(board.value(at: 0), 5)
    }

    func testGivenCellCannotBeOverwritten() {
        let given = givenWithValue(7, at: 10)
        var board = SudokuBoard(given: given)
        board.place(3, at: 10)
        XCTAssertEqual(board.value(at: 10), 7)
    }

    func testConflictDetection() {
        var board = SudokuBoard(given: emptyGrid())
        board.place(5, at: 0)  // row 0, col 0
        board.place(5, at: 1)  // row 0, col 1 — same row conflict
        let conflicts = board.conflicts(at: 1)
        XCTAssertTrue(conflicts.contains(0))
        XCTAssertTrue(conflicts.contains(1))
    }

    func testUndoRestoresPreviousState() {
        var board = SudokuBoard(given: emptyGrid())
        board.place(3, at: 5)
        board.undo()
        XCTAssertEqual(board.value(at: 5), 0)
    }

    func testNoteModeToggles() {
        var board = SudokuBoard(given: emptyGrid())
        board.toggleNote(4, at: 0)
        XCTAssertTrue(board.notesAt(0).contains(4))
        board.toggleNote(4, at: 0)
        XCTAssertFalse(board.notesAt(0).contains(4))
    }

    func testCompletionDetection() {
        let solution = validSolvedGrid()
        var board = SudokuBoard(given: Array(repeating: 0, count: 81))
        for i in 0..<81 { board.place(solution[i], at: i) }
        XCTAssertTrue(board.isComplete)
    }

    func testPeersCount() {
        let board = SudokuBoard(given: emptyGrid())
        // Every cell has exactly 20 peers (8 row + 8 col + 8 box - 4 overlaps)
        XCTAssertEqual(board.peers(of: 0).count, 20)
        XCTAssertEqual(board.peers(of: 40).count, 20) // center cell
    }
}
```

### Unit Tests — Credit Service

```swift
final class CreditServiceTests: XCTestCase {
    func testAwardingCreditsIncreasesBalance() async {
        let service = makeCreditService()
        await service.award(for: .puzzleCompletion)
        let balance = await service.balance()
        XCTAssertEqual(balance, CreditService.puzzleCompletionReward)
    }

    func testSpendingBelowZeroIsRejected() async {
        let service = makeCreditService()  // balance = 0
        await service.spend(10, reason: .hintUsed)
        let balance = await service.balance()
        XCTAssertEqual(balance, 0)  // no overdraft
    }
}
```

### UI Test Considerations

Focus on critical paths:

1. **Tap cell → tap digit → verify cell shows digit**
2. **Complete a puzzle → CompletionView appears → image reveal animates**
3. **Undo after placing a digit → cell returns to empty**
4. **Notes mode toggle → tapping digit adds pencil mark, not value**

Use `XCUITest` with accessibility identifiers:

```swift
// In views:
.accessibilityIdentifier("cell_\(index)")
.accessibilityIdentifier("digit_\(n)")
.accessibilityIdentifier("undo_button")

// In UI tests:
let cell = app.otherElements["cell_0"]
cell.tap()
app.buttons["digit_5"].tap()
XCTAssertEqual(cell.label, "Row 1, column 1. Placed 5.")
```

---

## Build Pipeline Notes

### Puzzle JSON Format

```json
[
  {
    "id": "easy_0001",
    "difficulty": "easy",
    "packID": "nature_pack1",
    "imageID": "forest_sunrise",
    "given": [5,3,0,0,7,0,0,0,0, ...],
    "solution": [5,3,4,6,7,8,9,1,2, ...]
  }
]
```

### Image Slicing Script (run at build time, not runtime)

```python
# tools/slice_images.py
from PIL import Image
import os, sys

def slice_image(src_path, out_dir, image_id):
    img = Image.open(src_path)
    w, h = img.size
    tw, th = w // 3, h // 3
    os.makedirs(out_dir, exist_ok=True)
    for row in range(3):
        for col in range(3):
            idx = row * 3 + col
            box = (col * tw, row * th, (col+1) * tw, (row+1) * th)
            tile = img.crop(box)
            tile.save(f"{out_dir}/{image_id}_tile_{idx}.png")

# Usage: python slice_images.py source_images/ output_assets/
```

Run this as a pre-build script or part of asset pipeline — never at runtime.

---

*End of SudokuReveal Blueprint — v1.0*
