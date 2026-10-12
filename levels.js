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
            "###################",
            "###......#.......C#",
            "#...#.#..#..###...#",
            "#.#.#.##...##.....#",
            "#.#...#...#...#...#",
            "#.###.#.#...####..#",
            "E.P.#...#...#..####",
            "#...##.##.###.##..#",
            "#.#.....#...#.....#",
            "#..###..#.#.#.#.###",
            "##...##...#...#...#",
            "###......####....C#",
            "###################"
        ],

        playerDelay: 110,
        criminalDelay: 240,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "fifone", cell: 1, arrested: false },
        ]
    },
    {
        name: "Livello 2",

        map: [
            "###################",
            "###......#.......C#",
            "#...#.#..#..###...#",
            "#.#.#.##...##.....#",
            "#.#...#...#...#...#",
            "#.###.#.#...####..#",
            "E.P.#...#...#..####",
            "#...##.##.###.##.C#",
            "#.#.....#...#.....#",
            "#..###..#.#.#.#.###",
            "##...##...#...#...#",
            "###......####....C#",
            "###################"
        ],

        playerDelay: 110,
        criminalDelay: 240,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "imprevedibile", cell: 1, arrested: false },
            { type: "fifone", cell: 2, arrested: false },
            
        ]
    },
    {
        name: "Livello 3",

        map: [
            "###################",
            "###......#.......C#",
            "#...#.#..#..###...#",
            "#.#.#.##...##.....#",
            "#.#...#...#...#...#",
            "#.###.#.#...####.C#",
            "E.P.#...#...#..####",
            "#...##.##.###.##.C#",
            "#.#.....#...#.....#",
            "#..###..#.#.#.#.###",
            "##...##...#...#...#",
            "###......####....C#",
            "###################"
        ],

        playerDelay: 110,
        criminalDelay: 240,

        bots: [
            { type: "furbo", cell: 0, arrested: false },
            { type: "imprevedibile", cell: 1, arrested: false },
            { type: "temerario", cell: 2, arrested: false },
            { type: "fifone", cell: 3, arrested: false },
        ]
    },
    {
        name: "Livello 4",

        map: [
            "###################",
            "##C......#.......C#",
            "#...#.#..#..###...#",
            "#.#.#.##...##.....#",
            "#.#...#...#...#...#",
            "#.###.#.#...####.C#",
            "E.P.#...#...#..####",
            "#...##.##.###.##.C#",
            "#.#.....#...#.....#",
            "#..###..#.#.#.#.###",
            "##...##...#...#...#",
            "###......####....C#",
            "###################"
        ],

        playerDelay: 110,
        criminalDelay: 240,

        bots: [
            { type: "furbo", cell: 0, arrested: true },
            { type: "furbo", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: false },
            
        ]
    },
    {
        name: "Livello 4",

        map: [
            "###################",
            "##C......#.......C#",
            "#...#.#..#..###...#",
            "#.#.#.##...##.....#",
            "#.#...#...#...#...#",
            "#.###.#.#...####.C#",
            "E.P.#...#...#..####",
            "#...##.##.###.##.C#",
            "#.#.....#...#.....#",
            "#..###..#.#.#.#.###",
            "##...##...#...#...#",
            "##C......####....C#",
            "###################"
        ],

        playerDelay: 110,
        criminalDelay: 240,

        bots: [
            { type: "furbo", cell: 0, arrested: true },
            { type: "furbo", cell: 1, arrested: false },
            { type: "imprevedibile", cell: 2, arrested: false },
            { type: "temerario", cell: 3, arrested: false },
            { type: "fifone", cell: 4, arrested: true },
            { type: "fifone", cell: 5, arrested: false },
            
        ]
    }
];
