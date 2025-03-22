class TowerOfHanoi {
    constructor() {
        this.numDisks = 6;
        this.towers = [[], [], []];
        this.selectedTower = null;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.isPlaying = false;
        this.minMoves = Math.pow(2, this.numDisks) - 1; // Minimum possible moves for 6 disks
        
        // DOM elements
        this.towerElements = [
            document.getElementById('tower1'),
            document.getElementById('tower2'),
            document.getElementById('tower3')
        ];
        this.timeDisplay = document.getElementById('time');
        this.movesDisplay = document.getElementById('moves');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.scoresList = document.getElementById('scoresList');

        // Event listeners
        this.towerElements.forEach((tower, index) => {
            tower.addEventListener('click', (e) => {
                if (e.target === tower || tower.contains(e.target)) {
                    this.handleTowerClick(index);
                }
            });
        });
        this.startBtn.addEventListener('click', () => this.startGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());

        // Initialize game
        this.initializeGame();
        this.loadHighScores();
    }

    initializeGame() {
        // Create disks
        for (let i = this.numDisks; i > 0; i--) {
            const disk = document.createElement('div');
            disk.className = 'disk';
            disk.style.width = `${i * 25 + 20}px`;
            this.towers[0].push(disk);
            this.towerElements[0].appendChild(disk);
        }
    }

    startGame() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.startTime = Date.now();
            this.startBtn.textContent = 'Game in Progress';
            this.startBtn.disabled = true;
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        }
    }

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    handleTowerClick(towerIndex) {
        if (!this.isPlaying) return;

        if (this.selectedTower === null) {
            if (this.towers[towerIndex].length > 0) {
                this.selectedTower = towerIndex;
                const selectedDisk = this.towers[towerIndex][this.towers[towerIndex].length - 1];
                selectedDisk.classList.add('selected');
            }
        } else {
            const selectedDisk = this.towers[this.selectedTower][this.towers[this.selectedTower].length - 1];
            selectedDisk.classList.remove('selected');

            if (this.isValidMove(this.selectedTower, towerIndex)) {
                this.moveDisk(this.selectedTower, towerIndex);
                this.moves++;
                this.movesDisplay.textContent = this.moves;
                
                if (this.checkWin()) {
                    this.handleWin();
                }
            }
            
            this.selectedTower = null;
        }
    }

    isValidMove(fromTower, toTower) {
        if (fromTower === toTower) return false;
        if (this.towers[fromTower].length === 0) return false;
        if (this.towers[toTower].length === 0) return true;
        
        const fromDisk = this.towers[fromTower][this.towers[fromTower].length - 1];
        const toDisk = this.towers[toTower][this.towers[toTower].length - 1];
        return parseInt(fromDisk.style.width) < parseInt(toDisk.style.width);
    }

    moveDisk(fromTower, toTower) {
        const disk = this.towers[fromTower].pop();
        this.towers[toTower].push(disk);
        
        this.towerElements[fromTower].removeChild(disk);
        this.towerElements[toTower].appendChild(disk);
    }

    checkWin() {
        return this.towers[2].length === this.numDisks;
    }

    handleWin() {
        clearInterval(this.timerInterval);
        this.isPlaying = false;
        this.startBtn.textContent = 'Start Game';
        this.startBtn.disabled = false;
        
        const time = Math.floor((Date.now() - this.startTime) / 1000);
        this.saveScore(time);
    }

    async saveScore(time) {
        const playerName = prompt('Congratulations! Enter your name for the high score:');
        if (!playerName) return;

        // Validate the score
        if (this.moves < this.minMoves) {
            alert('Invalid number of moves! The minimum possible moves for 6 disks is ' + this.minMoves);
            return;
        }

        const score = {
            name: playerName.trim(),
            time: time,
            moves: this.moves,
            date: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(score)
            });

            if (!response.ok) {
                const error = await response.json();
                alert('Error saving score: ' + error.error);
                return;
            }

            this.loadHighScores();
        } catch (error) {
            console.error('Error saving score:', error);
            alert('Error saving score. Please try again.');
        }
    }

    async loadHighScores() {
        try {
            const response = await fetch('/api/scores');
            if (!response.ok) {
                throw new Error('Failed to load scores');
            }
            const scores = await response.json();
            
            this.scoresList.innerHTML = scores
                .map(score => `
                    <div class="score-item">
                        <span>${score.name}</span>
                        <span>${Math.floor(score.time / 60)}:${(score.time % 60).toString().padStart(2, '0')}</span>
                        <span>${score.moves} moves</span>
                    </div>
                `)
                .join('');
        } catch (error) {
            console.error('Error loading high scores:', error);
            this.scoresList.innerHTML = '<div class="score-item">Error loading scores</div>';
        }
    }

    resetGame() {
        // Clear all towers
        this.towers.forEach((tower, index) => {
            tower.forEach(disk => {
                this.towerElements[index].removeChild(disk);
            });
            tower.length = 0;
        });

        // Reset game state
        this.moves = 0;
        this.movesDisplay.textContent = '0';
        this.timeDisplay.textContent = '0:00';
        clearInterval(this.timerInterval);
        this.isPlaying = false;
        this.startBtn.textContent = 'Start Game';
        this.startBtn.disabled = false;
        this.selectedTower = null;

        // Reinitialize game
        this.initializeGame();
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new TowerOfHanoi();
}); 
