const RAM_SIZE = 4096;
const C8_MAX_ROM = 0x1000 - 0x200 - 96;
const NUM_REGISTERS = 16;
const NUM_KEYS = 16;
const NUM_SCREEN_ROWS = 32;
const NUM_SCREEN_COLS = 64;

const fontROM = [
    0xF0, 0x90, 0x90, 0x90, 0xF0,
    0x20, 0x60, 0x20, 0x20, 0x70,
    0xF0, 0x10, 0xF0, 0x80, 0xF0,
    0xF0, 0x10, 0xF0, 0x10, 0xF0,
    0xA0, 0xA0, 0xF0, 0x20, 0x20,
    0xF0, 0x80, 0xF0, 0x10, 0xF0,
    0xF0, 0x80, 0xF0, 0x90, 0xF0,
    0xF0, 0x10, 0x20, 0x40, 0x40,
    0xF0, 0x90, 0xF0, 0x90, 0xF0,
    0xF0, 0x90, 0xF0, 0x10, 0xF0,
    0xF0, 0x90, 0xF0, 0x90, 0x90,
    0xE0, 0x90, 0xE0, 0x90, 0xE0,
    0xF0, 0x80, 0x80, 0x80, 0xF0,
    0xE0, 0x90, 0x90, 0x90, 0xE0,
    0xF0, 0x80, 0xF0, 0x80, 0xF0,
    0xF0, 0x80, 0xF0, 0x80, 0x80,
]

export default class C8 {
    constructor(rom) {
        this.ram = new Uint8Array[RAM_SIZE];

        if (rom.length > C8_MAX_ROM) {
            throw new Error("rom size too big, should be under " + C8_MAX_ROM + " bytes");
        }

        for (let i = 0; i < rom.length; i++) {
            this.ram[i + 0x200] = rom[i];
        }

        for (let i = 0; i < fontROM.length; i++) {
            this.ram[i] = fontROM[i];
        }

        this.initScreen();
        this.pc = 0x200;
        this.sp = 0;
        this.sb = 0xFA0; // bottom of the stack
        this.i = 0;
        this.v = new Uint16Array[NUM_REGISTERS];
        this.delayTimer = 0;
        this.soundTimer = 0;

        this.stop = true;
        this.keyState = new Array[NUM_KEYS];
    }

    initScreen() {
        this.screen = new Array(NUM_SCREEN_ROWS);
        for (let i = 0; i < NUM_SCREEN_ROWS; i++) {
            this.screen[i] = new Array(NUM_SCREEN_COLS).fill(0);
        }
    }

    clearScreen() {
        for (let i = 0; i < NUM_SCREEN_ROWS; i++) {
            this.screen[i].fill(0);
        }
    }


    tick() {
        let ins = ((this.ram[this.pc] & 0xFF) << 8) | (this.ram[this.pc + 1] & 0xFF);
        this.pc += 2;

        switch (this.getFirstOpCode(ins)) {
            case 0x0:
                Op_0(ins);
                break;
            case 0x1:
                Op_1(ins);
                break;
            case 0x2:
                Op_2(ins);
                break;
            case 0x3:
                Op_3(ins);
                break;
            case 0x4:
                Op_4(ins);
                break;
            case 0x5:
                Op_5(ins);
                break;
            case 0x6:
                Op_6(ins);
                break;
            case 0x7:
                Op_7(ins);
                break;
            case 0x8:
                Op_8(ins);
                break;
            case 0x9:
                Op_9(ins);
                break;
            case 0xa:
                Op_a(ins);
                break;
            case 0xb:
                Op_b(ins);
                break;
            case 0xc:
                Op_c(ins);
                break;
            case 0xd:
                Op_d(ins);
                break;
            case 0xe:
                Op_e(ins);
                break;
            case 0xf:
                Op_f(ins);
                break;
            default:
                throw new Error("unrecognised instruction: " + ins.toString(16));
        }
    }

    

    Op_0(ins) {
        switch(ins) {
            case 0x00E0:
                this.clearScreen();
                break;
            case 0x00EE:
                this.pc = (this.ram[this.sp] << 8) | (this.ram[this.sp + 1]);
                this.sp -= 2;
                break;
            default:
                this.pc = ins;
                break;
        }
    }

    Op_1(ins) {
        this.pc = this.getLastThreeOpCode(ins); 
    }

    Op_2(ins) {
        this.sp += 2;
        this.ram[this.sp] = (this.pc & 0xFFFF) >> 8;
        this.ram[this.sp + 1] = this.pc & 0xFF;
        this.pc = this.getLastThreeOpCode(ins);
    }

    Op_3(ins) {
        if (this.v[this.getSecondOpCode(ins)] == this.getLastTwoOpCode(ins)) {
            this.pc += 2;
        }
    }

    Op_4(ins) {
        if (this.v[this.getSecondOpCode(ins)] != this.getLastTwoOpCode(ins)) {
            this.pc += 2;
        }
    }

    Op_5(ins) {
        const y = this.getThirdOpCode(ins);
        const x = this.getSecondOpCode(ins);
        if (this.v[x] == this.v[y]) {
            this.pc += 2;
        }
    }

    Op_6(ins) {
        const kk = this.getLastTwoOpCode(ins);
        const x = this.getSecondOpCode(ins);
        this.v[x] = kk;
    }

    Op_7(ins) {
        const kk = this.getLastTwoOpCode(ins);
        const x = this.getSecondOpCode(ins);
        this.v[x] += kk;
    }

    Op_8(ins) {
        const y = this.getThirdOpCode(ins);
        const x = this.getSecondOpCode(ins);
        switch(this.getFourthOpCode(ins)) {    
            case 0x0:
                this.v[x] = this.v[y];
                break;
            case 0x1:
                this.v[x] |= this.v[y];
                break;
            case 0x2:
                this.v[x] &= this.v[y];
                break;
            case 0x3:
                this.v[x] ^= this.v[y];
                break;
            case 0x4:
                let sum = this.v[x] + this.v[y];
                this.v[0xF] = sum > 255 ? 1 : 0;
                this.v[x] = sum;
                break;
            case 0x5:
                this.v[0xF] = this.v[x] > this.v[y] ? 1 : 0;
                this.v[x] -= this.v[y];
                break;
            case 0x6:
                this.v[0xF] = (this.v[x] & 1) == 1 ? 1 : 0;
                this.v[x] >>= 1;
                break;
            case 0x7:
                this.v[0xF] = this.v[y] > this.v[x] ? 1 : this.v[0xF];
                this.v[x] = this.v[y] - this.v[x];
                break;
            case 0xe:
                this.v[0xF] = ((this.v[x] & 0x8000) >> 15) == 1 ? 1 : 0;
                this.v[x] <<= 1;
                break;
            default:
                throw new Error("Illegal operation: " + ins.toString(16));
        }
    }

    Op_9(ins) {
        const y = this.getThirdOpCode(ins);
        const x = this.getSecondOpCode(ins);
        this.pc += (x != y) ? 2 : 0;
    }

    Op_a(ins) {
        this.i = this.getLastThreeOpCode(ins);
    }

    Op_b(ins) {
        this.pc = this.getLastThreeOpCode(ins) + this.v[0x0];
    }

    Op_c(ins) {
        const x = this.getSecondOpCode(ins);
        const kk = this.getLastTwoOpCode(ins);
        const rand = Math.floor(Math.random() * Math.floor(256));
        this.v[x] = rand & kk;
    }

    Op_d(ins) {
        // TODO
        return;
    }

    Op_e(ins) {
        // TODO
        return;
    }

    Op_f(ins) {
        switch(this.getLastTwoOpCode(ins)) {
            case 0x07:
                // TODO
                break;
            case 0x0A:
                // TODO
                break;
            case 0x15:
                const x = this.getSecondOpCode(ins);
                this.delayTimer = this.v[x];
                break;
            case 0x18:
                const x = this.getSecondOpCode(ins);
                this.soundTimer = this.v[y];
                break;
            case 0x1E:
                const x = this.getSecondOpCode(ins);
                this.i += this.v[x];
                break;
            case 0x29:
                // TODO
                break;
            case 0x33:
                const x = this.getSecondOpCode(ins);
                const vx = this.v[x];
                const hundreds = vx / 100;
                const tens = vx / 10 - hundreds * 10;
                const ones = vx - tens * 10 - hundreds * 100;
        }
    }

    getFirstOpCode(ins) {
        return (ins & 0xf000) >> 12;
    }

    getSecondOpCode(ins) {
        return (ins & 0xf00) >> 8;
    }

    getThirdOpCode(ins) {
        return (ins & 0xf0) >> 4;
    }

    getFourthOpCode(ins) {
        return (ins & 0xf);
    }

    getLastTwoOpCode(ins) {
        return (ins & 0xff);
    }

    getLastThreeOpCode(ins) {
        return (ins & 0xfff);
    }
}