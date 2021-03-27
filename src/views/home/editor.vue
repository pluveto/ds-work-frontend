<!-- home -->
<template>
  <div class="editor">
    <div id="pixi"></div>
    <van-tabs v-model="selectedTool">
      <van-tab title="视图控制" name="move"> Location: ({{ cursorLoc.x }},{{ cursorLoc.y }}) </van-tab>
      <van-tab title="路径点标注" name="node">
        <van-form>
          <van-collapse v-model="tmp1">
            <van-collapse-item title="已添加">
              <div class="card">
                <table>
                  <tr>
                    <th>名称</th>
                    <th>坐标</th>
                  </tr>
                  <tr v-for="node in nodes" :key="node.guid">
                    <td>{{ node.title }} / {{ node.subtitle }}</td>
                    <td>{{ node.location.x }},{{ node.location.y }}</td>
                  </tr>
                </table>
              </div>
            </van-collapse-item>
          </van-collapse>

          <div>
            <van-field v-model="nodeEdit.formData.title" label="主名称" />
            <van-field v-model="nodeEdit.formData.subtitle" label="子名称" />
            <van-field v-model="nodeEdit.formData.location.x" type="digit" label="坐标 x" />
            <van-field v-model="nodeEdit.formData.location.y" type="digit" label="坐标 y" />
            <div class="m16"><van-button block type="primary" @click="submit">提交</van-button></div>
          </div>
        </van-form>

        <van-field v-model="jsonData" rows="2" autosize label="JSON 数据" type="textarea" show-word-limit />
      </van-tab>
      <van-tab title="路径标注" name="path">
        <van-collapse-item title="已添加">
          <div class="card">
            <table>
              <tr>
                <th>名称</th>
                <th>起点</th>
                <th>终点</th>
              </tr>
              <tr v-for="path in paths" :key="path.guid">
                <td>{{ path.title }}</td>
                <td>{{ path.start.x }},{{ path.start.y }}</td>
                <td>{{ path.end.x }},{{ path.end.y }}</td>
              </tr>
            </table>
          </div>
        </van-collapse-item>
        <div>
            <van-field v-model="pathEdit.formData.title" label="名称" />
            <van-field v-model="pathEdit.formData.start.x" type="digit" label="起点坐标 x" />
            <van-field v-model="pathEdit.formData.start.y" type="digit" label="起点坐标 y" />
            
            <van-field v-model="pathEdit.formData.end.x" type="digit" label="终点坐标 x" />
            <van-field v-model="pathEdit.formData.end.y" type="digit" label="终点坐标 y" />
            <div class="m16"><van-button block type="primary" @click="submit">提交</van-button></div>
          </div>
      </van-tab>
    </van-tabs>
    <van-row>
      <van-col span="12">
        <div class="m16">
          <van-button block @click="importData">导入数据</van-button>
        </div>
      </van-col>
      <van-col span="12">
        <div class="m16">
          <van-button block @click="exportData">导出数据</van-button>
        </div>
      </van-col>
    </van-row>
  </div>
</template>

<script>
import cytoscape from 'cytoscape';

/* eslint-disable */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
var global = {}
var config = {
  backgroundColor: 0xf6f8fa
}

var store = {
  res: {
    map: 'https://cdn.jsdelivr.net/gh/pluveto/0images@master/picgo/map.png'
  }
}

export default {
  data() {
    return {
      baby: null,
      tmp1: [],
      message: 'Hello Vue!',
      jsonData: '',
      cursorLoc: {
        x: 0,
        y: 0
      },
      selectedTool: 'node',
      nodes: [],
      nodeEdit: {
        status: 'add',
        formData: {
          title: null,
          subtitle: null,
          location: { x: null, y: null }
        }
      },
      paths: [],
      pathEdit: {
        status: 'add',
        formData: {
          title: null,
          start: { x: null, y: null },
          end: { x: null, y: null }
        }
      },
      sprites: {
        map: null,
        editingnode: null
      },
      dragging: false,
      diff: {
        x: null,
        y: null
      }
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    importData() {
      var items = JSON.parse(this.jsonData)
      items.forEach(x => {
        this.nodeEdit.formData = x
        this.submit()
      })
    },
    exportData() {
      var exp = []
      this.nodes.forEach(x =>
        exp.push({
          title: x.title,
          subtitle: x.subtitle,
          location: x.location
        })
      )
      this.jsonData = JSON.stringify(exp)
    },
    submit() {
      if (this.nodeEdit.status === 'add') {
        var map = this.sprites.map
        var data = JSON.parse(JSON.stringify(this.nodeEdit.formData))

        var graphics = new PIXI.Graphics()
        graphics.beginFill(0x1a0dab)
        graphics.lineStyle(1, 0xaee4ff)
        var size = 10
        graphics.drawRect(data.location.x - size / 2, data.location.y - size / 2, size, size)
        data.graphics = graphics
        data.guid = uuidv4()
        this.nodes.push(data)

        map.addChild(graphics)
      }
    },
    init() {
      //Create a Pixi babylication
      let pixi = new PIXI.Application({ width: window.innerWidth, height: 480 })
      pixi.renderer.autoResize = true
      this.pixi = pixi
      pixi.renderer.backgroundColor = 0xf6f8fa
      //Add the canvas that Pixi automatically created for you to the HTML document
      document.getElementById('pixi').appendChild(pixi.view)

      pixi.loader.add(store.res.map).load(() => {
        this.setupMap()
        this.setupnodeEditor()
      })
    },
    setupnodeEditor() {
      var size = 10

      var map = this.sprites.map
      var removeEditingnode = () => {
        if (this.sprites.editingnode) {
          var s = this.sprites.editingnode
          this.sprites.map.removeChild(s)
          this.sprites.editingnode = null
        }
      }
      map.on('pointerdown', event => {
        if (this.selectedTool !== 'node') return
        this.nodeEdit.formData.location.x = this.cursorLoc.x
        this.nodeEdit.formData.location.y = this.cursorLoc.y

        var graphics = new PIXI.Graphics()
        graphics.beginFill(0xff2424)
        graphics.lineStyle(1, 0xaee4ff)
        graphics.drawRect(event.data.global.x - size / 2 - map.x, event.data.global.y - size / 2 - map.y, size, size)
        removeEditingnode()
        this.sprites.editingnode = graphics
        map.addChild(graphics)
      })
      map.on('pointermove', event => {
        if (!this.dragging || this.selectedTool !== 'node' || this.sprites.editingnode === null) return
        this.sprites.editingnode.position.x = event.data.global.x - map.x - this.diff.x
        this.sprites.editingnode.position.y = event.data.global.y - map.y - this.diff.y

        this.nodeEdit.formData.location.x = this.cursorLoc.x
        this.nodeEdit.formData.location.y = this.cursorLoc.y
      })
    },
    setupMap() {
      let map = new PIXI.Sprite(this.pixi.loader.resources[store.res.map].texture)
      map.interactive = true
      map
        .on('pointerdown', event => {
          this.dragging = true
          this.diff = {
            x: event.data.global.x - map.x,
            y: event.data.global.y - map.y
          }
        })
        .on('pointerup', event => {
          this.dragging = false
        })
        .on('pointermove', event => {
          this.cursorLoc.x = event.data.global.x - map.position.x
          this.cursorLoc.y = event.data.global.y - map.position.y
          if (!this.dragging || this.selectedTool !== 'move') {
            return
          }
          map.position.x = event.data.global.x - this.diff.x
          map.position.y = event.data.global.y - this.diff.y
        })

      this.pixi.stage.addChild(map)
      this.sprites.map = map
    }
  }
}
</script>
<style scoped>
.m16 {
  margin: 16px;
}
table {
  width: 100%;
  margin-top: 12px;
  color: #34495e;
  font-size: 14px;
  line-height: 1.5;
  border-collapse: collapse;
}
.van-doc-content table td {
  padding: 8px;
  border-top: 1px solid #f1f4f8;
}
.card {
  margin-bottom: 24px;
  background-color: #fff;
  border-radius: 12px;
}
</style>