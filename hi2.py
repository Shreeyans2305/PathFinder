import pygame
import random

# --- CONFIG ---
WIDTH, HEIGHT = 800, 800
ROWS, COLS = 40, 40
CELL_SIZE = WIDTH // COLS

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)

pygame.init()
WIN = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Maze + DFS Visualization")

# --- CELL CLASS ---
class Cell:
    def __init__(self, row, col):
        self.row = row
        self.col = col

        self.maze_visited = False   # for maze generation
        self.path_visited = False   # for DFS visualization

        self.walls = [True, True, True, True]  # top, right, bottom, left

    def draw(self, win):
        x = self.col * CELL_SIZE
        y = self.row * CELL_SIZE

        # Base cell (always visible)
        pygame.draw.rect(win, WHITE, (x, y, CELL_SIZE, CELL_SIZE))

        # DFS visited cells
        if self.path_visited:
            pygame.draw.rect(win, YELLOW, (x, y, CELL_SIZE, CELL_SIZE))

        # Walls
        if self.walls[0]:
            pygame.draw.line(win, BLACK, (x, y), (x + CELL_SIZE, y), 2)
        if self.walls[1]:
            pygame.draw.line(win, BLACK, (x + CELL_SIZE, y), (x + CELL_SIZE, y + CELL_SIZE), 2)
        if self.walls[2]:
            pygame.draw.line(win, BLACK, (x + CELL_SIZE, y + CELL_SIZE), (x, y + CELL_SIZE), 2)
        if self.walls[3]:
            pygame.draw.line(win, BLACK, (x, y + CELL_SIZE), (x, y), 2)


# --- GRID ---
grid = [[Cell(r, c) for c in range(COLS)] for r in range(ROWS)]

def get_neighbors(cell):
    neighbors = []
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]

    for i, (dr, dc) in enumerate(directions):
        r = cell.row + dr
        c = cell.col + dc
        if 0 <= r < ROWS and 0 <= c < COLS and not grid[r][c].maze_visited:
            neighbors.append((grid[r][c], i))

    return neighbors


def remove_walls(current, next_cell, direction):
    current.walls[direction] = False
    next_cell.walls[(direction + 2) % 4] = False


# --- MAZE GENERATION ---
def generate_maze():
    stack = []
    current = grid[0][0]
    current.maze_visited = True

    while True:
        neighbors = get_neighbors(current)

        if neighbors:
            next_cell, direction = random.choice(neighbors)
            stack.append(current)

            remove_walls(current, next_cell, direction)

            current = next_cell
            current.maze_visited = True
        elif stack:
            current = stack.pop()
        else:
            break


# --- RESET PATHFINDING ---
def reset_pathfinding():
    for row in grid:
        for cell in row:
            cell.path_visited = False


# --- DRAW ---
def draw_grid(win):
    win.fill(BLACK)
    for row in grid:
        for cell in row:
            cell.draw(win)


# --- START / END ---
start = grid[0][0]
end = grid[ROWS - 1][COLS - 1]


# --- VALID MOVES (NO WALLS) ---
def get_valid_neighbors(cell):
    neighbors = []
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]

    for i, (dr, dc) in enumerate(directions):
        if not cell.walls[i]:
            r = cell.row + dr
            c = cell.col + dc
            if 0 <= r < ROWS and 0 <= c < COLS:
                neighbors.append(grid[r][c])

    return neighbors


# --- DFS PATHFINDING ---
def pathfinding_algorithm(start, end):
    stack = [start]
    visited = set()

    while stack:
        current = stack.pop()

        if current in visited:
            continue

        visited.add(current)
        current.path_visited = True

        # --- DRAW ---
        draw_grid(WIN)
        pygame.draw.rect(WIN, GREEN, (start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))
        pygame.draw.rect(WIN, RED, (end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))

        pygame.display.update()
        pygame.time.delay(15)

        # Allow quitting
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return

        # Goal reached
        if current == end:
            print("Reached the end!")
            return

        # Add neighbors
        for neighbor in get_valid_neighbors(current):
            if neighbor not in visited:
                stack.append(neighbor)


# --- MAIN LOOP ---
def main():
    generate_maze()
    reset_pathfinding()

    running = True
    started_algo = False

    while running:
        draw_grid(WIN)

        # Draw start & end
        pygame.draw.rect(WIN, GREEN, (start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))
        pygame.draw.rect(WIN, RED, (end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))

        pygame.display.update()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and not started_algo:
                    started_algo = True
                    pathfinding_algorithm(start, end)

    pygame.quit()


if __name__ == "__main__":
    main()