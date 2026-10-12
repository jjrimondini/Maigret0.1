/*
 * La mappa del livello, una stringa per riga. Legenda:
 * - "#" = muro
 * - "." = corridoio percorribile
 * - "C" = cella della prigione (una per angolo), dove partono i criminali
 * - "P" = posizione iniziale del giocatore (Maigret)
 * Si accede a una casella con map[y][x] (prima la riga, poi la colonna).
 */

export const levels = [
    {
        name: "Livello 1",

        map: [
            "###################",
            "#C..#....#....#..C#",
            "#...#....#....#...#",
            "###...##...##...###",
            "#.....#...#.......#",
            "#.###.#.#.#.#####.#",
            "#...#...#P..#.....#",
            "#.#.#####.###.###.#",
            "#.#.....#...#.....#",
            "#.#####...#...###.#",
            "#.....#...#...#...#",
            "#C..#....#....#..C#",
            "###################"
        ],

        playerDelay: 125,
        criminalDelay: 300,

        bots: [
            { type: "fifone", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false }
        ]
    },

    {
        name: "Livello 2",

        map: [
            "###################",
            "#C..#....#....#..C#",
            "#...#....#....#...#",
            "###...##...##...###",
            "#.....#...#.......#",
            "#.###.#.#.#.#####.#",
            "#...#...#P..#.....#",
            "#.#.#####.###.###.#",
            "#.#.....#...#.....#",
            "#.#####...#...###.#",
            "#.....#...#...#...#",
            "#C..#....#....#..C#",
            "###################"
        ],

        playerDelay: 120,
        criminalDelay: 270,

        bots: [
            { type: "fifone", cell: 0, arrested: false },
            { type: "furbo", cell: 1, arrested: false },
            { type: "temerario", cell: 2, arrested: false }
        ]
    },

    {
        name: "Livello 3",

        map: [
            "###################",
            "#C..#....#....#..C#",
            "#...#....#....#...#",
            "###...##...##...###",
            "#.....#...#.......#",
            "#.###.#.#.#.#####.#",
            "#...#...#P..#.....#",
            "#.#.#####.###.###.#",
            "#.#.....#...#.....#",
            "#.#####...#...###.#",
            "#.....#...#...#...#",
            "#C..#....#....#..C#",
            "###################"
        ],

        playerDelay: 110,
        criminalDelay: 240,

        bots: [
            { type: "fifone", cell: 0, arrested: true },
            { type: "furbo", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false }
        ]
    }
];
