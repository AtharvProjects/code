export interface WordClue {
    word: string;
    clue: string;
}

export interface PlacedWord extends WordClue {
    row: number;
    col: number;
    direction: 'across' | 'down';
    number: number;
}

export interface GridCell {
    letter: string | null;
    isBlack: boolean;
    number: number | null;
}

export interface Clue {
    number: number;
    clue: string;
    word: string;
}

export interface Clues {
    across: Clue[];
    down: Clue[];
}

export type ClueStyle = 'cryptic' | 'direct' | 'proverbs' | 'mixed';

export interface PuzzleData {
    grid: GridCell[][];
    clues: Clues;
    unplacedWords?: WordClue[];
}

