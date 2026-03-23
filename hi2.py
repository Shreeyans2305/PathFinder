import pygame
import random
import time
import heapq
# --- CONFIG ---
WIDTH, HEIGHT = 800, 800
ROWS, COLS = 80, 80
CELL_SIZE = WIDTH // COLS

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)

pygame.init()
WIN = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Maze + Algorithm Visualization")

# --- CELL CLASS ---
class Cell:
    def __init__(self, row, col):
        self.row = row
        self.col = col

        self.maze_visited = False   # for maze generation
        self.path_visited = False   # for DFS visualization
        self.distance_covered = 0
        self.is_path = False

        self.walls = [True, True, True, True]  # top, right, bottom, left

    def draw(self, win):
        x = self.col * CELL_SIZE
        y = self.row * CELL_SIZE

        # Base cell (always visible)
# Base cell
        pygame.draw.rect(win, WHITE, (x, y, CELL_SIZE, CELL_SIZE))

# Visited cells
        if self.path_visited:
            pygame.draw.rect(win, YELLOW, (x, y, CELL_SIZE, CELL_SIZE))

# ⭐ FINAL PATH (draw AFTER visited so it overrides)
        if self.is_path:
            pygame.draw.rect(win, (0, 0, 255), (x, y, CELL_SIZE, CELL_SIZE))

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

def reconstruct_path(parent, end):
    current = end
    while current in parent:
        current = parent[current]
        current.is_path = True  # you can color this differently

        draw_grid(WIN)
        pygame.display.update()
        pygame.time.delay(20)

# --- DFS PATHFINDING ---
def dfs(start, end):
    stack = [start]
    visited = set()
    parent = {}
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
        pygame.time.delay(0)

        # Allow quitting
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                reconstruct_path(parent, current)
                return

        # Goal reached
        if current == end:
            print("Reached the end!")
            return

        # Add neighbors
        for neighbor in get_valid_neighbors(current):
            parent[neighbor] = current
            if neighbor not in visited:
                stack.append(neighbor)


from collections import deque

def bfs(start, end):
    queue = deque([start])
    visited = set([start])  # mark immediately

    while queue:
        current = queue.popleft()

        current.path_visited = True

        # --- DRAW ---
        draw_grid(WIN)
        pygame.draw.rect(WIN, GREEN, (start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))
        pygame.draw.rect(WIN, RED, (end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))

        pygame.display.update()
        pygame.time.delay(0)

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
                visited.add(neighbor)   # ✅ mark here
                queue.append(neighbor)

def manhattan_distance(node,end):
    return abs(end.row - node.row) + abs(end.col - node.col)

def gbfs2(start, end):
    heap = []
    counter = 0

    heapq.heappush(heap, (manhattan_distance(start, end), counter, start))

    visited = set()
    while heap:
        _, _, current = heapq.heappop(heap)
        if current in visited:
            continue
        visited.add(current)
        current.path_visited = True

        draw_grid(WIN)
        pygame.draw.rect(WIN, GREEN, (start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))
        pygame.draw.rect(WIN, RED, (end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))

        pygame.display.update()
        pygame.time.delay(0)

        # Allow quitting
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
        
        if current == end:
            print("Reached the end!")
            return
        
        for neighbour in get_valid_neighbors(current):
            if neighbour not in visited:
                counter += 1
                heapq.heappush(heap, (manhattan_distance(neighbour, end), counter, neighbour))


def cost_function(node,end):
    return manhattan_distance(node,end)+node.distance_covered

def a_star(start, end):
    heap = []
    visited = set()
    counter = 0
    start.distance_covered = 0

    heapq.heappush(heap, (cost_function(start, end), counter, start))
    while heap:
        _,_,current = heapq.heappop(heap)

        if current in visited:
            continue

        visited.add(current)
        current.path_visited = True

        # --- DRAW ---
        draw_grid(WIN)
        pygame.draw.rect(WIN, GREEN, (start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))
        pygame.draw.rect(WIN, RED, (end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))

        pygame.display.update()
        pygame.time.delay(0)

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
                neighbor.distance_covered = current.distance_covered+1
                counter+=1
                heapq.heappush(heap, (cost_function(neighbor, end), counter, neighbor))





def a_star2(start, end):
    heap = []
    counter = 0

    g_score = {start: 0}
    parent = {}

    heapq.heappush(heap, (manhattan_distance(start, end), counter, start))

    visited = set()

    while heap:
        _, _, current = heapq.heappop(heap)

        if current in visited:
            continue
        visited.add(current)

        current.path_visited = True

        # --- DRAW ---
        draw_grid(WIN)
        pygame.draw.rect(WIN, GREEN, (start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))
        pygame.draw.rect(WIN, RED, (end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE))

        pygame.display.update()
        pygame.time.delay(0)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return

        if current == end:
            print("Reached the end!")
            reconstruct_path(parent, end)
            return

        for neighbor in get_valid_neighbors(current):
            tentative_g = g_score[current] + 1

            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                parent[neighbor] = current
                g_score[neighbor] = tentative_g

                f_score = tentative_g + manhattan_distance(neighbor, end)

                counter += 1
                heapq.heappush(heap, (f_score, counter, neighbor))
# --- MAIN LOOP ---


def clear_gird():
    for row in grid:
        for cell in row:
            cell.path_visited = False
            cell.is_path = False   # ← ADD THIS
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
                    # start_time = time.perf_counter()
                    # result = dfs(start, end)
                    # end_time = time.perf_counter()
                    # elapsed_time = end_time - start_time
                    # print(f"Execution time: {elapsed_time:.4f} seconds")
                    # clear_gird()

                    # start_time = time.perf_counter()
                    # result = bfs(start, end)
                    # end_time = time.perf_counter()
                    # elapsed_time = end_time - start_time
                    # print(f"Execution time: {elapsed_time:.4f} seconds")
                    # clear_gird()

                    # start_time = time.perf_counter()
                    # result = gbfs2(start, end)
                    # end_time = time.perf_counter()
                    # elapsed_time = end_time - start_time
                    # print(f"Execution time: {elapsed_time:.4f} seconds")
                    # clear_gird()

                    start_time = time.perf_counter()
                    result = a_star2(start, end)
                    end_time = time.perf_counter()
                    elapsed_time = end_time - start_time
                    print(f"Execution time: {elapsed_time:.4f} seconds")

    pygame.quit()


if __name__ == "__main__":
    main()