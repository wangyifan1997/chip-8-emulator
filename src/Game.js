import React from 'react';
import C8 from './chip_8/model';
import { parseTextRom, CH_TEST } from './rom/rom';
import './Game.css';

const CELL_SIZE = 20;
const WIDTH = 1280;
const HEIGHT = 640;

class Cell extends React.Component {

    render() {
        const { x, y } = this.props;
        return (
            <div className="Cell" style={{
                left: `${CELL_SIZE * x + 1}px`,
                top: `${CELL_SIZE * y + 1}px`,
                width: `${CELL_SIZE - 1}px`,
                height: `${CELL_SIZE - 1}px`,
            }} />
        );
    }
};

class Game extends React.Component {

    constructor() {
        super();
        this.rows = HEIGHT / CELL_SIZE;
        this.cols = WIDTH / CELL_SIZE;

        // this.board = this.makeEmptyBoard();

        this.rom = parseTextRom(CH_TEST);
        this.chip8 = new C8(this.rom);

        this.state = {
            cells: [],
            isRunning: false,
            interval: 300,
            frequency: 1,
        }

        this.intervalHandler = setInterval(this.tick, this.state.interval);
    }

    componentDidMount = () => {
        this.setState({
            isRunning: true,
        });
    }

    componentWillUnmount = () => {
        clearInterval(this.intervalHandler);
    }

    tick = () => {
        if (this.state.isRunning) {
            let numCycleLeft = this.state.frequency;
            while (numCycleLeft > 0) {
                this.chip8.tick();
                numCycleLeft--;
            }
            const cells = this.makeCells(this.chip8.getScreen());
            this.setState({
                cells
            });
        } 
    }

    makeCells = (screen) => {
        let cells = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (screen[y][x]) {
                    cells.push({ x, y });
                }
            }
        }
        console.log(cells);

        return cells;
    }

    render() {
        const { cells, interval, isRunning } = this.state;
        return (
            <div>
                <div className="Board"
                    style={{ width: WIDTH, height: HEIGHT, backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`}}
                    ref={(n) => { this.boardRef = n; }}>

                    {cells.map(cell => (
                        <Cell x={cell.x} y={cell.y} key={`${cell.x},${cell.y}`}/>
                    ))}
                </div>
            </div>
        );
    }
}

export default Game;