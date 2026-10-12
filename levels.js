/*
 * La mappa del livello, una stringa per riga. Legenda:
 * - "#" = muro
 * - "." = corridoio percorribile
 * - "C" = cella della prigione (una per angolo), dove partono i criminali
 * - "P" = posizione iniziale del giocatore (Maigret)
 * "E" = uscita: se un criminale ci arriva, il livello è perso
 * Si accede a una casella con map[y][x] (prima la riga, poi la colonna).
 */

export const levels = [
     {
        name: "Livello 1",

        map: [
            "###############",
            "#C....#......C#",
            "###.#.#.###.###",
            "#...###.##....#",
            "#.#.....###.###",
            "###.###.#....##",
            "#.#.##....#####",
            "#......##.#...#",
            "####.#......###",
            "##...#.##.#...#",
            "##.#....#.###.#",
            "##.#.##.......#",
            "##.#.##P##.##.#",
            "##.........#..#",
            "#######E#######"
        ],

        playerDelay: 110,
        criminalDelay: 300,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
        ]
    },
    {
        name: "Livello 2",

        map: [
            "###############",
            "#C....#......C#",
            "###.#C#.###.###",
            "#...###.##C...#",
            "#.#.....###.###",
            "###.###.#....##",
            "#.#.##....#####",
            "#......##.#...#",
            "####.#......###",
            "##...#.##.#...#",
            "##.#....#.###.#",
            "##.#.##.......#",
            "##.#.##P##.##.#",
            "##.........#..#",
            "#######E#######"
        ],

        playerDelay: 110,
        criminalDelay: 300,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            
        ]
    },
    {
        name: "Livello 3",

        map: [
            "###############",
            "#C....#......C#",
            "###.#C#.###.###",
            "#...###.##C...#",
            "#C#.....###.###",
            "###.###.#...C##",
            "#.#.##....#####",
            "#......##.#...#",
            "####.#......###",
            "##...#.##.#...#",
            "##.#....#.###.#",
            "##.#.##.......#",
            "##.#.##P##.##.#",
            "##.........#..#",
            "#######E#######"
        ],

        playerDelay: 110,
        criminalDelay: 300,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: true },
            { type: "furbo", cell: 5, arrested: true },
        ]
    },
    {
        name: "Livello 4",

        map: [
            "###############",
            "#C....#......C#",
            "###.#C#.###.###",
            "#...###.##C...#",
            "#C#.....###.###",
            "###.###.#...C##",
            "#C#.##....#####",
            "#......##.#..C#",
            "####.#......###",
            "##...#.##.#...#",
            "##.#....#.###.#",
            "##.#.##.......#",
            "##.#.##P##.##.#",
            "##.........#..#",
            "#######E#######"
        ],

        playerDelay: 110,
        criminalDelay: 300,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: true },
            { type: "furbo", cell: 5, arrested: true },
            { type: "temerario", cell: 6, arrested: true },
            { type: "imprevedibile", cell: 7, arrested: true },
            
        ]
    },
    {
        name: "Livello 5",

        map: [
            "###############",
            "#C....#......C#",
            "###.#C#.###.###",
            "#...###.##C...#",
            "#C#.....###.###",
            "###.###.#...C##",
            "#C#.##....#####",
            "#......##.#..C#",
            "####.#......###",
            "##...#.##.#...#",
            "##.#....#.###.#",
            "##C#.##.......#",
            "##.#.##P##.##.#",
            "##..........C.#",
            "#######E#######"
        ],

        playerDelay: 110,
        criminalDelay: 300,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: true },
            { type: "furbo", cell: 5, arrested: true },
            { type: "temerario", cell: 6, arrested: true },
            { type: "imprevedibile", cell: 7, arrested: true },
            { type: "furbo", cell: 8, arrested: true },
            { type: "fifone", cell: 9, arrested: true },
        ]
    },
]