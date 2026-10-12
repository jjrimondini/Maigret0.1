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
        criminalDelay: 270,

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
        criminalDelay: 270,

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
        criminalDelay: 270,

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
        criminalDelay: 270,

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
        criminalDelay: 270,

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
    {
        name: "Livello 6",

        map: [
            "####################",
            "#..##.....#........#",
            "##....###.#..#.###.#",
            "##.##.###...##..#..#",
            "#...#.#...#.###.#.##",
            "#.#.#...#..B.......#",
            "#.....###.#.#.####.#",
            "#..#.###C.#.#..#...#",
            "####.....##.##.#.###",
            "#C...###.#C........#",
            "#.##.......#.#.###.#",
            "#.....#.##.#.#.##..#",
            "#.#.P.#.##.....#...#",
            "#...#......C##...###",
            "###E################"
        ],

        playerDelay: 100,
        criminalDelay: 230,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
        ]
    },
    {
        name: "Livello 7",

        map: [
            "####################",
            "#C.##.....#.......C#",
            "##....###.#..#.###.#",
            "##.##.###...##..#..#",
            "#...#.#...#.###.#.##",
            "#.#.#...#..B.......#",
            "#.....###.#.#.####.#",
            "#..#.###C.#.#..#...#",
            "####.....##.##.#.###",
            "#C...###.#C........#",
            "#.##.......#.#.###.#",
            "#.....#.##.#.#.##..#",
            "#.#.P.#.##.....#...#",
            "#...#......C##...###",
            "###E################"
        ],

        playerDelay: 100,
        criminalDelay: 230,

        bots: [
            { type: "imprevedibile", cell: 0, arrested: true },
            { type: "fifone", cell: 1, arrested: true },
            { type: "furbo", cell: 2, arrested: false },
            { type: "fifone", cell: 3, arrested: false },
            { type: "imprevedibile", cell: 4, arrested: false },
            { type: "temerario", cell: 5, arrested: false },
            
            
        ]
    },
    {
        name: "Livello 8",

        map: [
            "####################",
            "#C.##.....#.......C#",
            "##....###.#..#.###.#",
            "##.##.###...##..#..#",
            "#...#.#...#.###.#.##",
            "#.#.#...#..B.......#",
            "#.....###.#.#.####.#",
            "#..#.###C.#.#..#.C.#",
            "####.....##.##.#.###",
            "#C...###.#C........#",
            "#.##.......#.#.###.#",
            "#.....#.##.#.#.##..#",
            "#.#.P.#.##.....#C..#",
            "#...#......C##...###",
            "###E################"
        ],

        playerDelay: 100,
        criminalDelay: 230,

        bots: [
            { type: "imprevedibile", cell: 0, arrested: true },
            { type: "fifone", cell: 1, arrested: true },
            { type: "furbo", cell: 2, arrested: false },
            { type: "furbo", cell: 3, arrested: true },
            { type: "fifone", cell: 4, arrested: false },
            { type: "imprevedibile", cell: 5, arrested: false },
            { type: "temerario", cell: 6, arrested: true },
            { type: "temerario", cell: 7, arrested: false },
            
            
        ]
    },
    {
        name: "Livello 9",

        map: [
            "####################",
            "#C.##..C..#C......C#",
            "##....###.#..#.###.#",
            "##.##.###...##..#..#",
            "#...#.#...#.###.#.##",
            "#.#.#...#..B.......#",
            "#.....###.#.#.####.#",
            "#..#.###C.#.#..#.C.#",
            "####.....##.##.#.###",
            "#C...###.#C........#",
            "#.##.......#.#.###.#",
            "#.....#.##.#.#.##..#",
            "#.#.P.#.##.....#C..#",
            "#...#......C##...###",
            "###E################"
        ],

        playerDelay: 100,
        criminalDelay: 230,

        bots: [
            { type: "imprevedibile", cell: 0, arrested: true },
            { type: "fifone", cell: 1, arrested: true },
            { type: "imprevedibile", cell: 2, arrested: true },
            { type: "fifone", cell: 3, arrested: true },
            { type: "furbo", cell: 4, arrested: false },
            { type: "furbo", cell: 5, arrested: true },
            { type: "fifone", cell: 6, arrested: false },
            { type: "imprevedibile", cell: 7, arrested: false },
            { type: "temerario", cell: 8, arrested: true },
            { type: "temerario", cell: 9, arrested: false },
        ]
    },
    {
        name: "Livello 10",

        map: [
            "####################",
            "#C.##..C..#C......C#",
            "##....###.#..#.###.#",
            "##.##.###...##C.#..#",
            "#...#.#...#.###.#.##",
            "#.#.#...#..B.......#",
            "#.....###.#.#.####.#",
            "#C.#.###C.#.#..#.C.#",
            "####.....##.##.#.###",
            "#C...###.#C........#",
            "#.##.......#.#.###.#",
            "#.....#.##.#.#.##..#",
            "#.#.P.#.##.....#C..#",
            "#...#......C##...###",
            "###E################"
        ],

        playerDelay: 100,
        criminalDelay: 230,

        bots: [
            { type: "imprevedibile", cell: 0, arrested: true },
            { type: "fifone", cell: 1, arrested: true },
            { type: "imprevedibile", cell: 2, arrested: true },
            { type: "fifone", cell: 3, arrested: true },
            { type: "furbo", cell: 4, arrested: false },
            { type: "furbo", cell: 5, arrested: true },
            { type: "temerario", cell: 6, arrested: false },
            { type: "furbo", cell: 7, arrested: true },
            { type: "fifone", cell: 8, arrested: false },
            { type: "imprevedibile", cell: 9, arrested: false },
            { type: "temerario", cell: 10, arrested: true },
            { type: "temerario", cell: 11, arrested: false },
        ]
    },
    {
        name: "Livello 11",

        map: [
            "#######################",
            "#C.#...#.........#...C#",
            "##.#.#.#.##.#.##...##.#",
            "#B...#....#...##.#....#",
            "#.##C##.#...#.#..#C####",
            "#..#.##.#####.#.##....#",
            "##......#S..#......##.#",
            "#..#.##.#.#...##.#....#",
            "#.##.##.#.##.###.##.###",
            "#.....#......#...#...##",
            "##.##.#.####.#.#.#.#.##",
            "##.#....#....#.#.#...##",
            "#...C#.##.##........###",
            "#.##.#....##.#..#.P..##",
            "#....#.##....#.###.#.##",
            "#C##...#####.#........#",
            "##############E###E####"
        ],

        playerDelay: 90,
        criminalDelay: 200,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "temerario", cell: 1, arrested: false },
            { type: "furbo", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "imprevedibile", cell: 4, arrested: false },
            { type: "imprevedibile", cell: 5, arrested: false },
        ]
    },
    {
        name: "Livello 12",

        map: [
            "#######################",
            "#C.#...#.........#...C#",
            "##.#.#.#.##.#.##...##.#",
            "#B...#....#...##.#....#",
            "#.##C##.#...#.#..#C####",
            "#..#.##C#####.#C##....#",
            "##......#S..#......##.#",
            "#..#.##.#.#...##.#....#",
            "#.##.##.#.##.###.##.###",
            "#.....#......#...#...##",
            "##.##.#.####.#.#.#.#.##",
            "##.#....#....#.#.#...##",
            "#...C#.##.##........###",
            "#.##.#....##.#..#.P..##",
            "#....#.##....#.###.#.##",
            "#C##...#####.#........#",
            "##############E###E####"
        ],

        playerDelay: 90,
        criminalDelay: 200,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "temerario", cell: 1, arrested: false },
            { type: "furbo", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: true },
            { type: "fifone", cell: 5, arrested: true },
            { type: "imprevedibile", cell: 6, arrested: false },
            { type: "imprevedibile", cell: 7, arrested: false },
        ]
    },
    {
        name: "Livello 13",

        map: [
            "#######################",
            "#C.#...#.........#...C#",
            "##.#.#.#.##.#.##...##.#",
            "#B...#....#...##.#....#",
            "#.##C##.#...#.#..#C####",
            "#..#.##C#####.#C##....#",
            "##......#S..#......##.#",
            "#..#.##.#.#...##.#....#",
            "#.##.##.#.##.###.##.###",
            "#.....#.C....#C..#...##",
            "##.##.#.####.#.#.#.#.##",
            "##.#....#....#.#.#...##",
            "#...C#.##.##........###",
            "#.##.#....##.#..#.P..##",
            "#....#.##....#.###.#.##",
            "#C##...#####.#........#",
            "##############E###E####"
        ],

        playerDelay: 90,
        criminalDelay: 200,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "temerario", cell: 1, arrested: false },
            { type: "furbo", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: true },
            { type: "fifone", cell: 5, arrested: true },
            { type: "fifone", cell: 6, arrested: true },
            { type: "fifone", cell: 7, arrested: true },
            { type: "imprevedibile", cell: 8, arrested: false },
            { type: "imprevedibile", cell: 9, arrested: false },
        ]
    },
    {
        name: "Livello 14",

        map: [
            "#######################",
            "#C.#...#.........#...C#",
            "##.#.#.#.##.#.##...##.#",
            "#B...#....#C..##.#....#",
            "#.##C##.#...#.#..#C####",
            "#..#.##C#####.#C##....#",
            "##......#S..#......##.#",
            "#..#.##.#.#...##.#....#",
            "#.##.##.#.##.###.##.###",
            "#.....#.C....#C..#...##",
            "##.##.#.####.#.#.#.#.##",
            "##.#....#....#.#.#...##",
            "#...C#.##.##........###",
            "#.##.#....##.#..#.P..##",
            "#....#.##....#.###.#.##",
            "#C##...#####.#.......C#",
            "##############E###E####"
        ],

        playerDelay: 90,
        criminalDelay: 200,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "temerario", cell: 1, arrested: false },
            { type: "fifone", cell: 2, arrested: true },
            { type: "furbo", cell: 3, arrested: false },
            { type: "temerario", cell: 4, arrested: false },
            { type: "fifone", cell: 5, arrested: true },
            { type: "fifone", cell: 6, arrested: true },
            { type: "fifone", cell: 7, arrested: true },
            { type: "fifone", cell: 8, arrested: true },
            { type: "imprevedibile", cell: 9, arrested: false },
            { type: "imprevedibile", cell: 10, arrested: false },
            { type: "temerario", cell: 11, arrested: true },
        ]
    },
    {
        name: "Livello 15",

        map: [
            "#######################",
            "#C.#...#.........#...C#",
            "##.#.#.#.##.#.##...##.#",
            "#B...#....#C..##.#....#",
            "#.##C##.#...#.#..#C####",
            "#..#.##C#####.#C##....#",
            "##......#S..#......##.#",
            "#..#.##.#.#...##.#....#",
            "#.##.##.#.##.###.##.###",
            "#.....#.C....#C..#...##",
            "##.##.#.####.#.#.#.#.##",
            "##.#....#....#.#.#...##",
            "#...C#.##C##........###",
            "#.##.#....##.#..#.P..##",
            "#....#.##....#.###.#.##",
            "#C##...#####C#.......C#",
            "##############E###E####"
        ],

        playerDelay: 90,
        criminalDelay: 200,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "temerario", cell: 1, arrested: false },
            { type: "fifone", cell: 2, arrested: true },
            { type: "furbo", cell: 3, arrested: false },
            { type: "temerario", cell: 4, arrested: false },
            { type: "fifone", cell: 5, arrested: true },
            { type: "fifone", cell: 6, arrested: true },
            { type: "fifone", cell: 7, arrested: true },
            { type: "fifone", cell: 8, arrested: true },
            { type: "imprevedibile", cell: 9, arrested: false },
            { type: "furbo", cell: 10, arrested: true },
            { type: "imprevedibile", cell: 11, arrested: false },
            { type: "imprevedibile", cell: 12, arrested: true },
            { type: "temerario", cell: 13, arrested: true },
        ]
    },
]

