import {keyMap} from './util';

const RAM_SIZE = 4096;
const C8_MAX_ROM = 0x1000 - 0x200 - 96;
const START_PC = 0x200;
const STACK_BOTTOM = 0xFA0 - 2;
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
        if (rom.length > C8_MAX_ROM) {
            throw new Error("rom size too big, should be under " + C8_MAX_ROM + " bytes");
        }

        this.ram = new Uint8Array(RAM_SIZE);

        for (let i = 0; i < rom.length; i++) {
            this.ram[i + START_PC] = rom[i];
        }

        for (let i = 0; i < fontROM.length; i++) {
            this.ram[i] = fontROM[i];
        }

        this.screen = new Array(NUM_SCREEN_ROWS);
        for (let i = 0; i < NUM_SCREEN_ROWS; i++) {
            this.screen[i] = new Array(NUM_SCREEN_COLS).fill(0);
        }

        this.pc = START_PC;
        this.sp = STACK_BOTTOM; // FA0 is the bottom of the stack
        this.i = 0;
        this.v = new Uint8Array(NUM_REGISTERS);
        this.delayTimer = 0;
        this.soundTimer = 0;

        this.draw = () => { };
        this.isWaiting = false;
        this.targetReg = 0;
        this.keyState = new Array(NUM_KEYS).fill(false);
    }

    setDraw = (drawFunc) => {
        this.draw = drawFunc;
    }

    _clearScreen = () => {
        for (let i = 0; i < NUM_SCREEN_ROWS; i++) {
            this.screen[i].fill(0);
        }
    }

    getScreen = () => {
        return this.screen;
    };

    tick = () => {
        if (this.isWaiting) return;

        let ins = ((this.ram[this.pc] & 0xFF) << 8) | (this.ram[this.pc + 1] & 0xFF);

        this.pc += 2;

        switch (this._getFirstOpCode(ins)) {
            case 0x0:
                this._Op_0(ins);
                break;
            case 0x1:
                this._Op_1(ins);
                break;
            case 0x2:
                this._Op_2(ins);
                break;
            case 0x3:
                this._Op_3(ins);
                break;
            case 0x4:
                this._Op_4(ins);
                break;
            case 0x5:
                this._Op_5(ins);
                break;
            case 0x6:
                this._Op_6(ins);
                break;
            case 0x7:
                this._Op_7(ins);
                break;
            case 0x8:
                this._Op_8(ins);
                break;
            case 0x9:
                this._Op_9(ins);
                break;
            case 0xa:
                this._Op_a(ins);
                break;
            case 0xb:
                this._Op_b(ins);
                break;
            case 0xc:
                this._Op_c(ins);
                break;
            case 0xd:
                this._Op_d(ins);
                break;
            case 0xe:
                this._Op_e(ins);
                break;
            case 0xf:
                this._Op_f(ins);
                break;
            default:
                throw new Error("unrecognised instruction: " + ins.toString(16));
        }
    };



    _Op_0 = (ins) => {
        switch (ins) {
            case 0x00E0:
                this._clearScreen();
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

    _Op_1 = (ins) => {
        this.pc = this._getLastThreeOpCode(ins);
    }

    _Op_2 = (ins) => {
        this.sp += 2;
        this.ram[this.sp] = (this.pc & 0xFFFF) >> 8;
        this.ram[this.sp + 1] = this.pc & 0xFF;
        this.pc = this._getLastThreeOpCode(ins);
    }

    _Op_3 = (ins) => {
        if (this.v[this._getSecondOpCode(ins)] === this._getLastTwoOpCode(ins)) {
            this.pc += 2;
        }
    }

    _Op_4 = (ins) => {
        if (this.v[this._getSecondOpCode(ins)] !== this._getLastTwoOpCode(ins)) {
            this.pc += 2;
        }
    }

    _Op_5 = (ins) => {
        const y = this._getThirdOpCode(ins);
        const x = this._getSecondOpCode(ins);
        if (this.v[x] === this.v[y]) {
            this.pc += 2;
        }
    }

    _Op_6 = (ins) => {
        const kk = this._getLastTwoOpCode(ins);
        const x = this._getSecondOpCode(ins);
        this.v[x] = kk;
    }

    _Op_7 = (ins) => {
        const kk = this._getLastTwoOpCode(ins);
        const x = this._getSecondOpCode(ins);
        this.v[x] += kk;
    }

    _Op_8 = (ins) => {
        const y = this._getThirdOpCode(ins);
        const x = this._getSecondOpCode(ins);
        switch (this._getFourthOpCode(ins)) {
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
                this.v[0xF] = sum > 255;
                this.v[x] = sum;
                break;
            case 0x5:
                this.v[0xF] = this.v[x] >= this.v[y];
                this.v[x] -= this.v[y];
                break;
            case 0x6:
                this.v[0xF] = this.v[x] & 1;
                // this.v[x] = this.v[y] >>= 1;
                this.v[x] >>= 1;
                break;
            case 0x7:
                this.v[0xF] = this.v[y] >= this.v[x];
                this.v[x] = this.v[y] - this.v[x];
                break;
            case 0xe:
                this.v[0xF] = (this.v[x] >> 7) & 1;
                // this.v[x] = this.v[y] <<= 1;
                this.v[x] <<= 1;
                break;
            default:
                throw new Error("Illegal operation: " + ins.toString(16));
        }
    }

    _Op_9 = (ins) => {
        const y = this._getThirdOpCode(ins);
        const x = this._getSecondOpCode(ins);
        this.pc += (this.v[x] !== this.v[y]) ? 2 : 0;
    }

    _Op_a = (ins) => {
        this.i = this._getLastThreeOpCode(ins);
    }

    _Op_b = (ins) => {
        this.pc = this._getLastThreeOpCode(ins) + this.v[0x0];
    }

    _Op_c = (ins) => {
        const x = this._getSecondOpCode(ins);
        const kk = this._getLastTwoOpCode(ins);
        const rand = Math.floor(Math.random() * Math.floor(256));
        this.v[x] = rand & kk;
    }

    _Op_d = (ins) => {
        const x = this._getSecondOpCode(ins);
        const y = this._getThirdOpCode(ins);
        const n = this._getFourthOpCode(ins);

        this.v[0xF] = 0;

        for (let k = 0; k < n; k++) {
            const byte = this.ram[this.i + k];
            for (let offset = 7; offset >= 0; offset--) {
                const state = (byte >> offset) & 1;
                if (!state) continue;
                const row = (this.v[y] + k) % NUM_SCREEN_ROWS;
                const col = (this.v[x] + (7 - offset)) % NUM_SCREEN_COLS;
                if (this.screen[row][col]) {
                    this.v[0xF] = 1;
                }
                this.screen[row][col] ^= 1;
            }
        }


        this.draw();
    }

    _Op_e = (ins) => {
        const x = this._getSecondOpCode(ins);
        switch (this._getLastTwoOpCode(ins)) {
            case 0x9E:
                this.pc += this.keyState[this.v[x]] ? 2 : 0;
                break;
            case 0xA1:
                this.pc += !this.keyState[this.v[x]] ? 2 : 0;
                break;
            default:
                throw new Error("Illegal operation: " + ins.toString(16));
        }
    }

    _Op_f = (ins) => {
        const x = this._getSecondOpCode(ins);
        switch (this._getLastTwoOpCode(ins)) {
            case 0x07:
                this.v[x] = this.delayTimer;
                break;
            case 0x0A:
                this.isWaiting = true;
                this.targetReg = x;
                break;
            case 0x15:
                this.delayTimer = this.v[x];
                break;
            case 0x18:
                this.soundTimer = this.v[x];
                break;
            case 0x1E:
                this.i += this.v[x];
                break;
            case 0x29:
                this.i = this.v[x] * 5;
                break;
            case 0x33:
                const vx = this.v[x];
                const hundreds = Math.floor(vx / 100);
                const tens = Math.floor(vx / 10) - hundreds * 10;
                const ones = vx - tens * 10 - hundreds * 100;
                this.ram[this.i] = hundreds;
                this.ram[this.i + 1] = tens;
                this.ram[this.i + 2] = ones;
                break;
            case 0x55:
                for (let k = 0; k <= x; k++) {
                    this.ram[this.i + k] = this.v[k];
                }
                // this.i = this.i + x + 1;
                break;
            case 0x65:
                for (let k = 0; k <= x; k++) {
                    this.v[k] = this.ram[this.i + k];
                }
                // this.i = this.i + x + 1;
                break;
            default:
                throw new Error("Illegal operation: " + ins.toString(16));
        }
    }

    keyUp = (key) => {
        const keyPressed = keyMap[key];
        this.keyState[keyPressed] = false;
    }


    keyDown = (key) => {
        const keyPressed = keyMap[key];
        if (this.isWaiting) {
            this.v[this.targetReg] = keyPressed;
            this.isWaiting = false;
        }
        this.keyState[keyPressed] = true;
    }

    decreaseDelayTimer = () => {
        if (this.delayTimer > 0) {
            this.delayTimer--;
        }
    }

    decreaseSoundTimer = () => {
        if (this.soundTimer > 0) {
            this.soundTimer--;
        }
    }

    _getFirstOpCode = (ins) => {
        return (ins & 0xf000) >> 12;
    }

    _getSecondOpCode = (ins) => {
        return (ins & 0xf00) >> 8;
    }

    _getThirdOpCode = (ins) => {
        return (ins & 0xf0) >> 4;
    }

    _getFourthOpCode = (ins) => {
        return (ins & 0xf);
    }

    _getLastTwoOpCode = (ins) => {
        return (ins & 0xff);
    }

    _getLastThreeOpCode = (ins) => {
        return (ins & 0xfff);
    }
}