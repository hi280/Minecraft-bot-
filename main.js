const mineflayer = require('mineflayer')
const pvp = require('mineflayer-pvp').plugin
const {pathfinder, Movements, goals} = require('mineflayer-pathfinder')
const armorManager = require('mineflayer-armor-manager')
const autoeat = require('mineflayer-auto-eat')
const collectBlock = require('mineflayer-collectblock').plugin
const fs = require('fs')
const toolPlugin = require('mineflayer-tool').plugin



const bot = mineflayer.createBot({
    host: 'mc.melon-craft.ru',
    username: 'pashatttu',
    //password: '135792468',
    version: '1.12'
})


bot.loadPlugin(pvp);
bot.loadPlugin(armorManager)
bot.loadPlugin(pathfinder)
bot.loadPlugin(autoeat)
bot.loadPlugin(collectBlock)
bot.loadPlugin(toolPlugin)

let taskInt = 0
const task = ("collect dirt 30" +'\n' + "collect log 20" + '\n' + 'craft double_stone_slab 30'+ '\n' + 'craft crafting_table' + '\n' + 'craft stick 5' + '\n' + 'craft wooden_sword' + '\n' + 'craft wooden_pickaxe' + '\n' + 'craft wooden_axe').split('\n')
let mcData
let fileContent = fs.readFileSync("bot-data.txt", "utf-8").split('\n')
let BossName = 'pashatttu2'
bot.once('spawn', () => {
    mcData = require('minecraft-data')(bot.version)

    TaskedFunct()
})

let count
let type
let taskink = false
let collecting = false
let attackMobs = false
let attackPlayer = false

function TaskedFunct(){
    const args = task[0].split(' ')
    if(args[0] == 'collect'){
        count = 1
        if(args.length === 3) count = parseInt(args[2])

        type = args[1]
        if(args.length === 3) type = args[1]

        taskink = true

        const itemType = mcData.itemsByName[type]
        const itemFind = bot.inventory.items().find(item => itemType.includes)
        if(itemFind){
            if(itemFind.count  <= count - 1){
                collectTool(count,type)
            }
            else{
                taskInt += 1
                TaskedFunct()
            }
        }
        else{
            collectTool(count,type)
        }
    }
}

bot.on('login', () => {
    bot.autoEat.options = {
        priority: 'foodPoints',
        startAt: 14,
        bannedFood: []
    }
})

bot.on('respawn', () => {
    bot.chat('respawn')
    TaskedFunct()
})

bot.on('health', () => {
    console.log(`food ${bot.food}`)
    if(bot.food !== 20){
        bot.autoEat.disable()
        bot.autoEat.enable()
    }
})

bot.on('playerCollect', (colector, itemDrop) =>{
    if(colector !== bot.entity) return

    setTimeout(() => {
        const sword = bot.inventory.items().find(item => item.name.includes('sword'))
        if(sword) bot.equip(sword, 'hand')
    }, 150)
})

bot.on('playerCollect', (colector, itemDrop) =>{
    if(colector !== bot.entity) return

    setTimeout(() => {
        const shield = bot.inventory.items().find(item => item.name.includes('shield'))
        if(shield) bot.equip(shield, 'off-hand')
    }, 300)
})

bot.on('chat', (username, message) => {
    if(username !== BossName) return

    if(message === 'guard'){
        const player = bot.players[username]

        if(!player){
            bot.chat("I can't see you")
            return
        }

        bot.chat("I will guard that location.")
        if(player.entity.position !== null)
            guardArea(player.entity.position)
    }

    if(message === 'I move'){
        const playerCI = bot.players[BossName]

        if(!playerCI || !playerCI.entity){
            return
        }

        bot.pathfinder.setMovements(new Movements(bot, mcData))
        bot.pathfinder.setGoal(new GoalFollow(playerCI.entity, 1), true)
    }

    if(message === 'task'){
        TaskedFunct()
    }

    if(message === 'attack false'){
        attackMobs = false
    }

    if(message === 'attack true'){
        attackMobs = true
    }

    if(message === 'attack player false'){
        attackPlayer = false
    }

    if(message === 'attack player true'){
        attackPlayer = true
    }

    if(message === 'fight me'){
        const player = bot.players[username]

        handSword()

        if(!player){
            bot.chat("I can't see you")
            return
        }

        bot.chat("Prepare to fight!")
        bot.pvp.attack(player.entity)
    }

    if(message === 'stop'){
        bot.chat('Iwill no longer quard this area.')
        stopGuarding()
    }

    const args = message.split(' ')
    if(args[0] !== 'collect') return

    count = 15
    if(args.length === 3) count = parseInt(args[2])

    type = args[1]
    if(args.length === 3) type = args[1]
    
    taskink = false

    collect(count,type)
})

function collects(count, type){
    const blockType = mcData.blocksByName[type]
    if(!blockType){
        bot.chat(`"I don't know any blocks named ${type}`)
        dig = false
        return
    }

    const blocks = bot.findBlocks({
        matching:   blockType.id,
        maxDistance: 100,
        count: count
    })

    if(blocks.length === 0) {
        bot.chat("I don't see that block nearby.")
        dig = false
        return
    }

    const targets = []
    for(let i = 0; i < Math.min(blocks.length, count); i++){
        targets.push(bot.blockAt(blocks[i]))
    }

    dig = true

    bot.collectBlock.collect(targets, err => {
        if(err){
            bot.chat(err.message)
            console.log(err)
        }else{
            bot.chat('Done')
        }
    })
}

function collect(count, type){
    console.log('dig block')
    bot.pvp.target = null
    const blockType = mcData.blocksByName[type]
    if(!blockType){
        bot.chat(`"I don't know any blocks named ${type}`)
        dig = false
        collecting = false
        return
    }

    const block = bot.findBlock({
        matching:   blockType.id,
        maxDistance: 100,
    })

    if(!block) {
        bot.chat("I don't see that block nearby.")
        dig = false
        collecting = false
        return
    }

    collecting = true

    let target = null
    //target.push(bot.blockAt(block))

    dig = true

    if(block)
            bot.tool.equipForBlock(block)
    
    setTimeout(() =>{
        const block2 = bot.blockAt(block.position)
        if(block2 !== null){
            bot.collectBlock.collect(block2, err => {
                if(err){
                    bot.chat(err.message)
                    console.log(err)
                    setTimeout(() => {
                        collect(count, type)
                    }, 300)
        
                }else{
                    bot.chat('Done' + count)
                    setTimeout(() => {
                        if((count - 1) > 0)
                            collect(count - 1, type)
                        else if(taskink){
                            taskInt += 1
                            TaskedFunct()
                        }
                    }, 300)
                }
            })
        }
        else{
            bot.chat('Done' + count)
            if((count - 1) > 0)
                collect(count - 1, type)
                else if(taskink){
                    taskInt += 1
                    TaskedFunct()
                }
        }
    }, 10)

}

function collectTool(count, type){
    console.log('dig block')
    bot.pvp.target = null
    const blockType = mcData.blocksByName[type]
    if(!blockType){
        bot.chat(`"I don't know any blocks named ${type}`)
        dig = false
        collecting = false
        return
    }

    const block = bot.findBlock({
        matching:   blockType.id,
        maxDistance: 100,
    })

    if(!block) {
        bot.chat("I don't see that block nearby.")
        dig = false
        collecting = false
        return
    }

    collecting = true

    let target = null
    //target.push(bot.blockAt(block))

    dig = true

    if(block){
        bot.tool.equipForBlock(block)
        guardArea(block.position)

        findBlockTool(block.position)
    }
}

let CountReload = 0

function findBlockTool(pos){
    setTimeout(() => {
        CountReload += 1
        const block = bot.blockAt(pos)
        if(block.name === 'air'){
            bot.chat('Done' + count)
            setTimeout(() => {
                if((count - 1) > 0)
                    collect(count - 1, type)
                else if(taskink){
                    askInt += 1
                    TaskedFunct()
                }
            }, 300)
        }
        else{
            findBlockTool(block.position)
        }
    }, 250)
}

let guardPos = null

function guardArea (pos) {
  guardPos = pos.clone()

  if (!bot.pvp.target) {
    moveToGuardPos()
  }
}

function handSword(){
    const sword = bot.inventory.items().find(item => item.name.includes('sword'))

    if(sword) 
        bot.equip(sword, 'hand')
}

function stopGuarding () {
    guardPos = null
    bot.pvp.stop()
    bot.pathfinder.setGoal(null)
    bot.tool.equipForBlock(null)
  }
  
  function moveToGuardPos () {
    bot.pathfinder.setMovements(new Movements(bot, mcData))
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
  }

  let dist = 16
  let dig = false
  let entity

  bot.on('physicTick', tick)

  function tick(){
    if(attackMobs === false) return

    getMobe()
    if(entity){
        bot.pvp.attack(entity)
        handSword()
    }
  }

function getMobe(){
    if(attackPlayer === false){
        if(!dig && !collecting)
            filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 && e.mobType !== 'Armor Stand'
        else
            filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 4 && e.mobType !== 'Armor Stand'
    }
    else{
        if(!dig && !collecting)
            filter = e => e.type === 'mob' && e.type === 'player' && e.position.distanceTo(bot.entity.position) < 16 && e.mobType !== 'Armor Stand'
        else
            filter = e => e.type === 'mob' && e.type === 'player'  && e.position.distanceTo(bot.entity.position) < 4 && e.mobType !== 'Armor Stand'
    }

    entity = bot.nearestEntity(filter)
}

bot.on('stoppedAttacking', () =>{
    if(collecting){
        collect(count, type)
    }

    if(guardPos && !collecting){
        moveToGuardPos()
        bot.autoEat.enable()
    }
})