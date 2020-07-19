// map key to indices of keyState array
export const keyMap = {
    "1": 0x1,
    "2": 0x2,
    "3": 0x3,
    "4": 0xC,
    "q": 0x4,
    "Q": 0x4,
    "w": 0x5,
    "W": 0x5,
    "e": 0x6,
    "E": 0x6,
    "r": 0xD,
    "R": 0xD,
    "a": 0x7,
    "A": 0x7,
    "s": 0x8,
    "S": 0x8,
    "d": 0x9,
    "D": 0x9,
    "f": 0xE,
    "F": 0xE,
    "z": 0xA,
    "Z": 0xA,
    "x": 0x0,
    "X": 0x0,
    "c": 0xB,
    "C": 0xB,
    "v": 0xF,
    "V": 0xF,
}

export const parseTextRom = (textRom) => {
    let textRomWithoutSpace = textRom.replace(/ +/g, '');
    let rom = Array(textRomWithoutSpace.length / 2);
    for (let i = 0; i < rom.length; i++) {
        rom[i] = parseInt(textRomWithoutSpace.substring(i * 2, i * 2 + 2), 16);
    }
    return rom;
}