const RAM_SIZE = 4096;
const C8_MAX_ROM = 0x1000 - 0x200 - 352;
const NUM_REGISTERS = 16;
const NUM_KEYS = 16;

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
        this.ram = Array[RAM_SIZE];
        this.ram.fill(0);

        if (rom.length > C8_MAX_ROM) {
            throw new Error("rom size too big, should be under " + C8_MAX_ROM + " bytes");
        }

        for (let i = 0; i < rom.length; i++) {
            this.ram[i + 0x200] = rom[i];
        }

        for (let i = 0; i < fontROM.length; i++) {
            this.ram[i] = fontROM[i];
        }

        this.screen = 0xf00;
        this.pc = 0x200;
        this.sp = 0;
        this.sb = 0xea0; // bottom of the stack
        this.i = 0;
        this.v = Array[NUM_REGISTERS];
        this.delayTimer = 0;
        this.soundTimer = 0;

        this.stop = true;
        this.keyState = Array[NUM_KEYS];
    }

    tick() {
        let ins = (this.ram[this.pc] << 8) | (this.ram[this.pc + 1]);
        this.pc += 2;

        switch (ins >> 12) {
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
                throw new Error("unrecognised instruction: " + ins);
        }
    }

    clearScreen() {
        for (let i = 0; i < 256; i++) {
            this.ram[this.screen + i] = 0;
        }
    }

    Op_0(ins) {
        switch(ins) {
            case 0x00e0:
                this.clearScreen();
                break;
            case 0x00ee:
                this.pc = (this.ram[this.sp] << 8) | (this.ram[this.sp + 1]);
                this.sp -= 2;
                break;
            default:
                this.pc = ins;
                break;
        }
    }

    Op_1(ins) {
        this.pc = (ins & 0xfff); 
    }

    Op_2(ins) {
        this.sp += 2;
        this.ram[this.sp] = (this.pc & 0xffff) >> 8;
        this.ram[this.sp + 1] = this.pc & 0xff;
        this.pc = ins & 0xfff;
    }

    Op_3(ins) {
        if (this.v[(ins >> 8) & 0xf] == (ins & 0xff)) {
            this.pc += 2;
        }
    }

    Op_4(ins) {
        if (this.v[(ins >> 8) & 0xf] != (ins & 0xff)) {
            this.pc += 2;
        }
    }

    Op_5(ins) {
        let y = (0xff & ins) >> 4;
        let x = (0xfff & ins) >> 8;
        if (this.v[x] == this.v[y]) {
            this.pc += 2;
        }
    }

    Op_6(ins) {
        let kk = ins & 0xff;
        let x = (ins & 0xfff) >> 8;
        this.v[x] = kk;
    }

    Op_7(ins) {
        let kk = ins & 0xff;
        let x = (ins & 0xfff) >> 8;
        this.v[x] = this.v[x] + kk;
    }

    Op_8(ins) {
        let y = (0xff & ins) >> 4;
        let x = (0xfff & ins) >> 8;
        switch(ins & 0xf) {    
            case 0x0:
                this.v[x] = this.v[y];
                break;
            case 0x1:
                this.v[x] = this.v[x] | this.v[y];
                break;
            case 0x2:
                this.v[x] = this.v[x] & this.v[y];
                break;
            case 0x3:
                this.v[x] = this.v[x] ^ this.v[y];
                break;
            case 0x4:
                let sum = this.v[x] + this.v[y];
                if (sum > 255) {
                    sum = sum & 0xff;
                    this.v[0xf] = 1;
                }
                this.v[x] = sum;
                break;
            case 0x5:
                break;
                

        }

        

    }

    Op_9(ins) {
        return;
    }

    Op_a(ins) {
        return;
    }

    Op_b(ins) {
        return;
    }

    Op_c(ins) {
        return;
    }

    Op_d(ins) {
        return;
    }

    Op_e(ins) {
        return;
    }

    Op_f(ins) {
        return;
    }
}