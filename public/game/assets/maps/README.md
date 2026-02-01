# Tiled Map Editor Setup for Study Brawler

## Quick Start

1. **Download Tiled** from https://www.mapeditor.org/ (free)

2. **Open the project** - In Tiled, open `StudyBrawler.tiled-project`

3. **Open the template** - Open `starter-template.tmx` to start with a pre-configured map

4. **Paint your map!**
   - Select tiles from the TilesetFloor panel on the right
   - Click/drag on the map to paint
   - Use the "Ground" layer for terrain (grass, paths, dirt)
   - Use the "Decoration" layer for objects on top
   - Use the "Above" layer for things that appear above the player (like tree tops)

## Tilesets Included

- **TilesetFloor** - Ground tiles (grass, dirt, sand, stone, paths)
- **TilesetElement** - Decorations (trees, rocks, flowers, signs)
- **TilesetNature** - More nature elements
- **TilesetHouse** - Buildings and structures
- **TilesetWater** - Water and bridges

## Map Specifications

- **Size**: 56 x 40 tiles (896 x 640 pixels)
- **Tile Size**: 16 x 16 pixels
- **Layers** (in order):
  1. Ground - Base terrain
  2. Decoration - Objects on the ground
  3. Above - Things rendered above the player

## Exporting for the Game

1. **File > Export As**
2. Choose **JSON format** (*.json)
3. Save as `forest.json` (or another name)
4. The game will automatically load `forest.json`

## Tips

- The grass tiles are in rows 6-7 of TilesetFloor (tiles 134-179)
- Use the paint bucket tool for filling large areas
- Hold Shift to draw straight lines
- Use multiple layers for depth (trees on Decoration, tree tops on Above)

## File Structure

```
maps/
├── StudyBrawler.tiled-project  <- Open this in Tiled
├── starter-template.tmx        <- Start editing this
├── forest.json                 <- Exported map for the game
├── TilesetFloor.tsx           <- Tileset definitions
├── TilesetElement.tsx
├── TilesetNature.tsx
├── TilesetHouse.tsx
└── TilesetWater.tsx
```
