const mineflayer = require('mineflayer')
const pvp = require('mineflayer-pvp').plugin
const {pathfinder, Movements, goals: { GoalNear, GoalFollow, GoalBlock}} = require('mineflayer-pathfinder')
const armorManager = require('mineflayer-armor-manager')
const autoeat = require('mineflayer-auto-eat')
const collectBlock = require('mineflayer-collectblock').plugin
const fs = require('fs')
const toolPlugin = require('mineflayer-tool').plugin
//const mineflayerViewer = require('prismarine-viewer').mineflayer
const active = require('./active.js')
const vec3 = require('vec3')
const {Client, Intents} = require('discord.js')
const intents = new Intents(['GUILDS', 'GUILD_MESSAGES'])
const client = new Client({
    intents: intents
})

let channel = "945533264582569986";

client.on('ready', () => {
    console.log(`Ready discord ${client.user.username}`)
    channel = client.channels.cache.get(channel)
    if(!channel){
        console.log(`not channel`)
        process.exit(1)
    }
})

client.on('messageCreate', message => {
    if(message.channel.id !== channel.id) return

    if(message.author.id === client.user.id) return

    reloadMess(message.content)
})

const bot = mineflayer.createBot({
    host: process.argv[4] ? process.argv[4] : 'mc.melon-craft.ru',
    username: process.argv[2] ? process.argv[2] : 'pashatttu2',
    //password: '135792468',
})

client.login("OTQ1MzUxNDU0NDYwMzc5MTg2.YhO5Jg.tMhaBnkBYTdGi4oi7qfMd42Fn_g")


bot.loadPlugin(pvp);
bot.loadPlugin(armorManager)
bot.loadPlugin(pathfinder)
bot.loadPlugin(autoeat)
bot.loadPlugin(collectBlock)
bot.loadPlugin(toolPlugin)

let taskInt = 0
const task2 = ('craft stone_pickaxe' + '\n' + 'craft diamond_axe').split('\n')
const task = ('chat command /tpask pashatttu' + '\n' +"collect diamond_ore 30 1000" +'\n' + "collect log 20 1000" + '\n' + 'craft wooden_sword true' + '\n' + 'craft wooden_pickaxe true' + '\n' + 'craft wooden_axe true').split('\n')
let mcData
let fileContent = fs.readFileSync("bot-data.txt", "utf-8").split('\n')
let BossName = process.argv[3] ? process.argv[3] : 'pashatttu'
bot.once('spawn', () => {
    mcData = require('minecraft-data')(bot.version)
    active.spawn(mcData)
    channel.send(`bot spawned`)
    //mineflayerViewer(bot, { port: 3007, firstPerson: true})

    //TaskedFunct()
    bot.chat('135792468')

    update()
})

bot.on('kicked', (reason, loggedIn)=>console.log(reason, loggedIn));
bot.on('error', err=>console.log(err));

let count
let type
let taskink = false
let collecting = false
let attackMobs = false
let attackPlayer = false

function TaskedFunct(){
    const args = task[taskInt].split(' ')
    if(args[0] == 'collect'){
        count = 1
        if(args.length >= 2) count = parseInt(args[2])

        type = args[1]
        if(args.length >= 3) type = args[1]

        let range = 100
        if(args.length === 4){
            range = parseInt(args[3])
        }

        taskink = true
        stoping = false

        collectTool(count,type, range)
    }

    if(args[0] === 'chat' && args[1] === 'command'){
        let commandStr
        if(args.length > 3)
            commandStr = args[2] + ' ' + args[3]
        else{
            commandStr = args[2]
        }

        bot.chat(commandStr)

        taskInt += 1
        TaskedFunct()
    }

    if(args[0] == 'craft'){
        let name = args[1]
        let count = 1
        let usingTable = false

        if(args.length >= 3){
            if(args[2] == 'true')
                usingTable = true
        }

        if(args.length == 4){
            count = parseInt(args[3])
        }

        channel.send('craft task')
        active.collectItem(bot, name, count)
    }

}

function getInventory(){
    let items = bot.inventory.items()
    let chat = ''
    for(i = 0; i < items.length; i++){
        chat += items[i].name
        chat += ' count ' + items[i].count + ' ,'
    }

    bot.chat(chat)
}

bot.on('login', () => {
    bot.autoEat.options = {
        priority: 'foodPoints',
        startAt: 19,
        bannedFood: []
    }
})

bot.on('respawn', () => {
    channel.send('respawn')
    //TaskedFunct()
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

    reloadMess(message)
})

function reloadMess(message){
    if(message === 'guard'){
        const player = bot.players[username]

        if(!player || !player.entity){
            channel.send("I can't see you")
            return
        }

        channel.send("I will guard that location.")
        if(player.entity.position !== null)
            guardArea(player.entity.position)
    }

    if(message === 'I move'){
        MoveThePlayer()

        channel.send('I moving')
    }

    if(message === 'invent get'){
        getInventory()
    }

    if(message === 'task'){
        TaskedFunct()
    }

    if(message === 'attack false'){
        attackMobs = false
    }

    if(message === "goto"){
        let target = bot.players[username].entity.position
        bot.pathfinder.goto(new GoalNear(target.x, target.y, target.z, 1))
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

    if(message === 'reload')
        reload()

    if(message === 'stop'){
        channel.send('Iwill no longer quard this area.')
        stopGuarding()
    }

    const args = message.split(' ')
    if(args[0] === 'collect'){
        count = 15
        if(args.length === 3) count = parseInt(args[2])

        type = args[1]
        if(args.length === 3) type = args[1]
    
        taskink = false
        stoping = false

        collectTool(count,type)
    }
    else{
        if(args[0] === 'chat' && args[1] === 'command'){
            let commandStr
            if(args.length > 3)
                commandStr = args[2] + ' ' + args[3]
            else{
                commandStr = args[2]
            }

            bot.chat(commandStr)
        }
    }
    
    if(args[0] === 'craft'){
        let name = args[1]
        let count = 1
        let usingTable = false

        if(args.length >= 3){
            if(args[2] == 'true')
                usingTable = true
        }

        if(args.length == 4){
            count = parseInt(args[3])
        }

        bot.chat('craft task')
        active.collectItem(bot, name, count)
    }

    if(args[0] === 'toss'){
        let ItemName = args[1]

        count = 1
        if(args.length === 3){
            count = parseInt(args[2])
        }

        Toss(ItemName, count)
    }
}

let moved = false

function MoveThePlayer(){
    let playerCI = bot.players[BossName]
    moved = true

    let goal = new GoalFollow(playerCI.entity, 1)
    bot.pathfinder.setGoal(goal, true)
}

function reload(){
    bot.waitForChunksToLoad()
}

const Toss = async (itemName, count)=>{
    if(active.checkInventory(bot, itemName)){
        let itemId = mcData.itemsByName[itemName].id
        await bot.toss(itemId, null, count)
    }
    else{
        console.log('no item and cout < target')
    }
}

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


function collectTool(count, type, range = 100, reload = true){
    bot.pvp.target = null
    const blockType = mcData.blocksByName[type]
    if(!blockType){
        bot.chat(`"I don't know any blocks named ${type}`)
        dig = false
        collecting = false
        timeOutUpd = 5000
        return
    }

    const block = bot.findBlock({
        matching:   blockType.id,
        maxDistance: range,
    })

    if(!block) {
        bot.chat("I don't see that block nearby.")
        dig = false
        collecting = false
        timeOutUpd = 5000
        if(reload === true)
            collectTool(count, type, range * 10)
        return
    }

    collecting = true

    let target = null
    //target.push(bot.blockAt(block))

    console.log('dig block')
    bot.tool.equipForBlock(block)
    guardArea(block.position)
    timeOutUpd = 600

    dig = true
    digedBlock = false
    digBlock = block
}

let digBlock
let digedBlock = false

let stoping = false

let CountReload = 0

function findBlockTool(pos, range = 100){
    console.log('find')
    CountReload += 1
    if(CountReload > 15){
        CountReload = 0
        collectTool(count, type, range)
    }

    let block = bot.blockAt(pos)
    if(block !== null){
        if(block.name === 'air'){
            console.log('Done' + count)
            digedBlock = true
            dig = false
            count -= 1
            setTimeout(() => {
                if(count > 0)
                    collectTool(count, type, range)
                else if(taskink){
                    timeOutUpd = 5000
                    taskInt += 1
                    TaskedFunct()
                    console.log('collected all blocks')
                }
            }, 300)
        }
    }
}

let timeOutUpd = 5000

function update(){
    setTimeout(() => {
        if(dig === true)
            findBlockTool(digBlock.position, 100)

        update()

    }, timeOutUpd)
}
    

let guardPos = null

function guardArea (pos, dist = 0) {
    if(pos)
        guardPos = pos.clone()

    if (!bot.pvp.target) {
        moveToGuardPos(dist)
    }
}

function moveToGoal(position){
    bot.pathfinder.setMovements(new Movements(bot, mcData))
    bot.pathfinder.setGoal(new GoalBlock(position))
}

function handSword(){
    const sword = bot.inventory.items().find(item => item.name.includes('sword'))

    if(sword) 
        bot.equip(sword, 'hand')
}

function stopGuarding () {
    guardPos = null
    dig = false
    digedBlock = false
    moved = false
    bot.pvp.stop()
    bot.pathfinder.setGoal(null)
    bot.stopDigging()
    stoping = true
}
  
  function moveToGuardPos (range) {
    bot.pathfinder.setMovements(new Movements(bot, mcData))
    bot.pathfinder.setGoal(new GoalNear(guardPos.x, guardPos.y, guardPos.z, range))
  }

  let dist = 16
  let dig = false
  let entity

  bot.on('physicTick', tick)

function tick(){

    if(attackMobs === true){
        getMobe()
        if(entity){
            bot.pvp.attack(entity)
            handSword()
        }
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
        collectTool(count, type)
    }

    if(guardPos && !collecting){
        moveToGuardPos()
        bot.autoEat.enable()
    }

    if(moved){
        MoveThePlayer()
    }
})

exports.guardArea = guardArea
exports.taskInt = taskInt
exports.TaskedFunct = TaskedFunct
exports.moveToGoal = moveToGoal
exports.collectTool = collectTool