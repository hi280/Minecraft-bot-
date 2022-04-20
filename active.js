let mcdata = require("minecraft-data")
const mineflayer = require('mineflayer')
const Item = require('prismarine-item')
const Recipe=require("prismarine-recipe")("1.12").Recipe;
const vec3 = require('vec3')
const index = require('./index.js')
const fs = require('fs')
const smelting = JSON.parse(fs.readFileSync('smelting.json', 'utf-8'))
const noBlocksRecipes = JSON.parse(fs.readFileSync('noBlocksRecipes.json', 'utf-8'))
const mcfinder = require('./mc-finder.js')
const tool = JSON.parse(fs.readFileSync('toolLevel.json', 'utf8'))

function spawn(mcData){
    mcdata = mcData
}

function sleep(time) {
    return new Promise(resolve=>setTimeout(resolve, time));
}

const pathfind = async (bot, position, range=1, range2, digged = false)=>{

    await index.guardArea(position, range)

    if(range2 === 0 && range === null) range2 = range

    if(digged === true){
        console.log('digged to path pos')
        let block = bot.blockAt(position)
        bot.tool.equipForBlock(block)
    }

    let i = 0

    while(bot.entity.position.distanceTo(position) > range2){
        await sleep(1500)
        console.log('find dist to pos')
        i += 1

        if(i >= 5){
            await sleep(1000)
            await index.guardArea(position, range)
        }
    }

    console.log('pathed pos')
}

function checkInventory(bot, itemName) {
    let items = bot.inventory.items()
    return items.filter(item => item.name === itemName).length;
};

const hasIngredients = (bot, ingredients)=>{
    //bot.inventory.count(mcdata.itemsByName[name].id);
    console.log("Checking for ingredients:");

    for (ingredient of ingredients) {
        //let name = mcdata.items[ingredient.id].name;
        //await collectItem(bot, name, -ingredient.count);
        let got = bot.inventory.count(ingredient.id);
        let get = -ingredient.count;

        console.log(`   ${mcdata.items[ingredient.id].name}: ${got}/${get} ${got >= get? '✔︎':'✘'}`);

        if (got < get) return false;
    }

    return true;
};

const clearBlock = async (bot, position)=>{

    let block = await bot.blockAt(position);

    bot.tool.equipForBlock(block)

    await pathfind(bot,position, 0, 5, true)

    let i = 0

    while(bot.blockAt(block.position).name !== "air"){
        i += 1
        await sleep(1000)
        console.log('find block')
        if(i >=5){
            i = 0
            await sleep(1000)
            bot.tool.equipForBlock(block)
            await pathfind(bot,position, 0, 1, true)
        }
    }

    console.log('clear block')

    let drop = bot.nearestEntity((entity)=>{
        return entity.name == 'item';
    });

    if (drop) {
        //await pathfind(bot, drop.position.clone().floor().offset(0.5, 0, 0.5), 1);
        await pathfind(bot, drop.position.clone().floor(), 0,1);
    }
    sleep(1000)
};

const prepareTable = async (bot, tableName)=>{
    tableType = mcdata.blocksByName[tableName]
    let table = bot.findBlock({
        matching: tableType.id,
        maxDistance:25
    });

    let tablePos

    if(!table){
        let blocks = bot.findBlocks({
            maxDistance: 8,
            matching: mcdata.blocksByName['air'].id,
            count: 64,
        });

        console.log(`Found ${blocks.length} air.`);

        let block

        const targets = []
        for(let i = 0; i < blocks.length; i++){
            targets.push(bot.blockAt(blocks[i]))
        }

        let index = 0

        for(i = 0; i < blocks.length;i++){
            if(bot.blockAt(targets[i].position.offset(0,-1,0)).name !== 'air' && bot.entity.position.distanceTo(targets[i].position) >= 1){
                index = i
            }
        }

        block = bot.blockAt(targets[index].position)

        if(bot.entity.position.distanceTo(targets[index].position) <= 1){
            let pos = bot.entity.position.offset(-3, 0, 0)

            await clearBlock(bot, pos)

            await pathfind(bot, pos.offset(3, 0, 0), 0, 2)

            block = bot.blockAt(pos)
        }

        await equip(bot, tableType.name)

        await placeBlock(bot, block.position, tableType.name)

        tablePos = block.position
    }
    else{
        tablePos = table.position
    }

    return tablePos
}

const equip = async (bot, itemName, slot='hand')=>{
    console.log('equip')
    let itemType = mcdata.itemsByName[itemName];

    if (!checkInventory(bot, itemName)) {
        if (bot.game.gameMode == 'creative') {
            await bot.creative.setInventorySlot(36, new Item(itemType, 1));
        } else {
            await collectItem(bot, itemName, 1);
        }
    }

    await bot.equip(itemType.id, 0);
    await bot.equip(itemType.id, slot);
}

const placeBlock = async (bot, position, type="dirt")=>{
    console.log('place block')
    //await clearBlock(bot, position).catch(console.log);

    equip(bot, type)

    let referenceBlock = bot.blockAt(position.offset(0, -1, 0));
    bot.placeBlock(referenceBlock, vec3(0, 1, 0)).catch(console.log);

    await sleep(1000)
};

const getItem = async (bot, item)=>{
    let sourceBlocks = mcfinder.blocks(item).map(block=>{
        return mcdata.blocksByName[block];
    })

    let blocks = bot.findBlocks({
        matching: sourceBlocks
    })

    if (blocks.length) {
        await clearBlock(bot, blocks[0])

        for (let loops = 0; loops < 10; loops++) {
            let drop = bot.nearestEntity((entity)=>{
                return entity.name == 'item'
            })

            if (drop) {
                //await pathfind(bot, drop.position.clone().floor().offset(0.5, 0, 0.5), 1);
                await pathfind(bot, drop.position.clone().floor(), 1)
            }
            await sleep(100)
        }
    } else {
        let recipes = mcfinder.recipes(bot, item)

        if (smelting[item]) {
            await smeltItem(bot, smelting[item].sources[0])
        } else if (recipes.length) {
            await craftItem(bot, item)
        } else {
            //console.log(`Couldn't find any recipes for ${item}.`);
            await craftItem(bot, item)
        }
    }
}

const fuels = ['coal', 'oak_log']

const smeltItem = async (bot, itemName)=>{
    let item = mcdata.itemsByName[itemName];

    if (!bot.inventory.count(item.id)) {
        await findAndClearBlock(bot, itemName)
    }

    let fuel = fuels.find((name)=>{
        return bot.inventory.count(mcdata.itemsByName[name]);
    });

    if (!fuel) {
        await findAndClearBlock(bot, 'coal');
        fuel = fuels[0];
        console.log("Got some fuel.");
    }

    let furnacePosition = await prepareTable(bot, 'furnace');
    let furnaceBlock = bot.blockAt(furnacePosition);

    /*let furnaceBlock = bot.findBlock({
        matching: mcdata.blocksByName.furnace.id,
    });*/

    if (furnaceBlock) {
        await pathfind(bot, furnaceBlock.position, 1, 3);

        let furnace = await bot.openFurnace(furnaceBlock);

        if(checkInventory(bot, item.name))
            await furnace.putInput(item.id, null, 1);
        else
            await findAndClearBlock(bot, itemName)
        
        await furnace.putFuel(mcdata.itemsByName[fuel].id, null, 1);

        furnace.close();

        while (true) { //This could easily be a problem. ¯\_(ツ)_/¯
            await sleep(2000);
            console.log("Waiting for furnace.");

            let furnace = await bot.openFurnace(furnaceBlock);
            let out = furnace.outputItem();
            if(furnaceBlock === null){
                await smeltItem(bot, itemName)
                break
            }

            if (!furnace.outputItem() && !furnace.inputItem()) {
                if(checkInventory(bot, item.name))
                    await furnace.putInput(item.id, null, 1);
                else
                    await findAndClearBlock(bot, itemName)
        
                furnace.putFuel(mcdata.itemsByName[fuel].id, null, 1);
            }

            if (furnace.outputItem()) {
                await furnace.takeOutput();
                furnace.close();
                break;
            }
            furnace.close();
        }
    }
};

const findAndClearBlock = async (bot, blockName, count = 1)=>{

    const blockType = mcdata.blocksByName[blockName]

    if(!blockType){
        console.log("no find block type")
        return
    }

    if(noBlocksRecipes[blockName].level !== -1)
        if(!checkInventory(bot, tool[noBlocksRecipes[blockName].level].sources)){
            await collectItem(bot, tool[noBlocksRecipes[blockName].level].sources, 1)
        }

    const blocks = bot.findBlocks({
        matching:   blockType.id,
        maxDistance: 1000,
        count: count
    })

    if(blocks.length === 0) {
        console.log("I don't see that block nearby.")
        return
    }

    const targets = []
    for(let i = 0; i < Math.min(blocks.length, count); i++){
        targets.push(bot.blockAt(blocks[i]))
    }


    for(i = 0 ;i < blocks.length;i++){
        let pos = targets[i].position
        await clearBlock(bot, pos)
    }
}

let usingTable = false

const getRecipes = async (bot, item, count = 1)=>{
    let recipes

    if(item){
        console.log(`get recipe ${item.name}`)

        recipes = await bot.recipesAll(item.id, null, count, false);

        if(!recipes[0]){
            console.log('no recipe')
            return
        }

        if (recipes[0].requiresTable) {
            usingTable = true;
            console.log("Crafting table required.");

            //let tablePosition = await prepareTable(bot, 'crafting_table');
            //craftingTable = bot.blockAt(tablePosition);
            tableType = mcdata.blocksByName.crafting_table
            let table = bot.findBlock({
                matching: tableType.id,
                maxDistance:15
            });
            if(!table && !checkInventory(bot, 'crafting_table'))
                await collectItem(bot, 'crafting_table', 1)

            recipes = await bot.recipesAll(item.id, count, true);
        }
    }
    else{
        recipes = []
        console.log('No item')
    }

    return recipes
}

const collectItem = async (bot, itemName, quantity)=>{
    usingTable = false
    let item = mcdata.itemsByName[itemName];
    let deposited = 0; //Keep track of items deposited into chests. (None for now because I haven't added that)
    if (!quantity) quantity = item.stackSize;

    let recipes = await getRecipes(bot, item, quantity)

    let needs = recipes[0].delta.filter((ingredient)=>{
        return ingredient.count < 0;
    });


    while (!hasIngredients(bot, needs)) {
        for (ingredient of needs) {
            let ItemIngredient = mcdata.items[ingredient.id]
            let name = ItemIngredient.name;

            if(noBlocksRecipes[name]){
                console.log('clearingBlock')
                    await findAndClearBlock(bot, noBlocksRecipes[name].sources, -ingredient.count)
            }
            else if(smelting[name]){
                await smeltItem(bot, smelting[name].sources)
            }
            else if (recipes.length){
                await collectItem(bot, name, -ingredient.count)
            }
            else{
                await collectItem(bot, name, -ingredient.count)
            }
        }
    }

    await craftItem(bot, itemName, recipes[0])
};

let craftingTable

const craftItem = async (bot, item, recipe)=>{
    console.log('craft ' + item)

    if(!recipe){
        console.log('no recipe')
    }

    if (recipe.requiresTable) {
        let craftingTablePos = await prepareTable(bot, 'crafting_table')

        craftingTablePos = await prepareTable(bot, 'crafting_table')
        
        craftingTable = bot.blockAt(craftingTablePos)

        await pathfind(bot, craftingTablePos, 1, 2)

        await sleep(1000)

        console.log('start craft')

        await bot.craft(recipe, 1, craftingTable);
    } else await bot.craft(recipe, 1, null);
    
    await sleep(500)

    console.log('crafted item')
}

const collectBlock = async (bot, blockName, count)=>{
    let blocks = bot.findBlocks({
        matching: blockName
    })

    for(i = 0; i < blocks.length;i++){
        await clearBlock(blocks[i].position)
    }
}

exports.craftItem = craftItem
exports.spawn = spawn
exports.collectItem = collectItem
exports.checkInventory = checkInventory