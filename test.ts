import Fuse from "fuse.js";

const players = [
    {
        id: "AF025EC10529E39B",
        name: "i dont care",
    },
    {
        id: "1A15773B394E971C",
        name: "pad nite",
    },
    {
        id: "2EC95BAA363415A6",
        name: "bladewing",
    },
    {
        id: "5BF6FE75EAB36C71",
        name: "Jutlander",
    },
    {
        id: "8C7D0EE8F320646A",
        name: "ACHILLES",
    },
    {
        id: "7AA32E28A35FFDB3",
        name: "washed up player",
    },
    {
        id: "4420523D233DCF28",
        name: "SmatBandit",
    },
    {
        id: "AA5953CF34447B26",
        name: "SaffronX",
    },
    {
        id: "222FD7A6A97E0987",
        name: "Tinppa",
    },
    {
        id: "E9EDE987E68C9C55",
        name: "[NFD]t.tv/Sturmtruppe70",
    },
    {
        id: "B57292FEF824135D",
        name: "poge",
    },
    {
        id: "3C21A460DDF01A71",
        name: "revy",
    },
    {
        id: "DF85D4AB71B2C22D",
        name: "In Purgatory",
    },
    {
        id: "ACF2D385776DBC5E",
        name: "czareq",
    },
    {
        id: "CAE9ADF1AF144AC7",
        name: "psie",
    },
];

const list = new Fuse(players, {
    threshold: 0.2,
    minMatchCharLength: 2,
    includeScore: true,
    keys: [
        {
            name: "id",
            weight: 10,
        },
        {
            name: "name",
            weight: 1,
        },
    ],
});

let message = "ACF2D385776DBC5E";
let query = { $or: [{ name: message }, { id: `${message}` }] };

console.log(message, list.search(query), list.search(query)[0]?.item);

message = "czare";
query = { $or: [{ name: message }, { id: `${message}` }] };
console.log(message, list.search(query), list.search(query)[0]?.item);
