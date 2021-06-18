<template>
  <div class="geditor">
    <van-nav-bar title="地图编辑器">
      <template #right>
        <v-icon name="ellipsis-v" @click="showMenu = true" />
      </template>
    </van-nav-bar>
    <van-action-sheet v-model="showMenu" :actions="menuActions" @select="onSelect" />

    <div id="cy" tabindex="0"></div>
    <van-tabs v-model="editorState">
      <van-tab title="路径" name="edge">
        <van-cell-group>
          <van-field v-if="edgeEdit.status === 'edit'" label="ID" :value="edgeEdit.formData.id" readonly />

          <van-field
            label="起点"
            v-if="edgeEdit.formData.source"
            :value="edgeEdit.formData.source.x + ',' + edgeEdit.formData.source.y"
            readonly
          />
          <van-field
            label="终点"
            v-if="edgeEdit.formData.target"
            :value="edgeEdit.formData.target.x + ',' + edgeEdit.formData.target.y"
            readonly
          />
          <van-field label="道路级别" v-model="edgeEdit.formData.level" />
          <van-field name="switch" label="虚拟道路">
            <template #input>
              <van-switch v-model="edgeEdit.formData.virtual" active-value="1" inactive-value="0" size="20" />
            </template>
          </van-field>

          <!-- <van-field name="radio" label="修改目标：">
            <template #input>
              <van-radio-group v-model="edgeEdit.modifyingType" direction="horizontal">
                <van-radio name="source">起点</van-radio>
                <van-radio name="target">终点</van-radio>
              </van-radio-group>
            </template>
          </van-field> -->
        </van-cell-group>

        <div class="btn-margin">
          <van-button block type="primary" @click="submitEdge()">
            <span v-if="edgeEdit.status === 'add'">添加</span>
            <span v-if="edgeEdit.status === 'edit'">编辑</span>
          </van-button>
          <van-button block v-if="false" type="info" @click="submitEdges()"> 批量添加 </van-button>
        </div>
        <div class="btn-margin">
          <van-button block type="danger" v-if="edgeEdit.status === 'edit'" @click="removeEdge"> 删除 </van-button>
        </div>
      </van-tab>
      <van-tab title="节点" name="node">
        <van-cell-group>
          <van-field v-if="nodeEdit.status === 'edit'" label="ID" :value="nodeEdit.formData.id" readonly />
          <van-field label="坐标" :value="nodeEdit.formData.position.x + ',' + nodeEdit.formData.position.y" readonly />
          <van-field label="名称" v-model="nodeEdit.formData.title" />
          <van-field label="子名称" v-model="nodeEdit.formData.subtitle" />
        </van-cell-group>

        <div class="btn-margin">
          <van-button block type="primary" @click="submitNode()">
            <span v-if="nodeEdit.status === 'add'">添加</span>
            <span v-if="nodeEdit.status === 'edit'">编辑</span>
          </van-button>
        </div>
        <div class="btn-margin">
          <van-button block type="danger" v-if="nodeEdit.status === 'edit'" @click="removeNode"> 删除 </van-button>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script>
// 用于实现路径编辑的库
var cytoscape = require('cytoscape')
var cyCanvas = require('cytoscape-canvas')

// 用于生成递增 id
//import { genId } from '../../utils/genId'
var i = +new Date()
function genId() {
  return ++i
}

// 实现导出 json 到浏览器，下载到本地的功能
import { download, load } from '../../utils/file'

cyCanvas(cytoscape) // Register extension

// 存放一些页面全局对象，避开 this 指针指向与预期不一致的情况。
var page = {
  vue: null,
  // 不要用 data 存放，否则页面会卡死
  cy: null
}

export default {
  data() {
    return {
      activeTab: 1,
      config: {
        defaultNodeColor: 'black',
        selectedNodeColor: '#3faf7e'
      },
      cy: null,
      // 是否显示菜单（点击右上角图标）
      showMenu: false,
      // 菜单的具体内容
      menuActions: [
        { name: '导入', action: 'import' },
        { name: '导出', action: 'export' },
        { name: '清空缓存', action: 'clearCache' },
        { name: '临时存档', action: 'saveToCache' }
      ],
      // 节点队列，用于批量创建, 使用方法是  this.nodeQuene.key = val
      nodeQuene: {},
      nodePair: { curId: null, prevId: null },
      // 正在编辑的标签页是什么, edge: 路径
      editorState: 'edge',
      // 路径编辑标签页
      edgeEdit: {
        status: 'add',
        // 这是绑定到单选的模型
        // 表示下一个点作为起点还是终点，unknown: 未知，source: 起点，target 终点
        //modifyingType: 'unknown',
        // 起点的 id
        sourceNode: null,
        // 终点的 id
        targetNode: null,
        // 起点和终点的坐标，仅仅作为展示使用
        formData: {
          id: null,
          source: { x: 0, y: 0 },
          target: { x: 0, y: 0 },
          level: '0',
          virtual: '0'
        }
      },
      nodeEdit: {
        // 节点只能编辑，因为通过 ctrl + 点击进行添加。
        status: 'edit',
        selectedNode: null,
        formData: {
          id: null,
          title: null,
          subtitle: null,
          position: { x: 0, y: 0 }
        }
      },
      lastSelectedType: null
    }
  },
  methods: {
    // 在两个节点之间添加路径
    addEdge(sourceId, targetId, level = null) {
      if (level == null) {
        level = this.edgeEdit.formData.level
        console.log('null, use form')
      }
      page.cy.add({
        group: 'edges',
        data: {
          id: genId(),
          source: sourceId,
          target: targetId,
          level: level,
          virtual: '0'
        }
      })
    },
    addNode() {},
    // 当按下 Delete 发生
    deleteSelected() {
      console.log('press delete')
      if (this.lastSelectedType == 'edge') {
        this.removeEdge()
      }
      if (this.lastSelectedType == 'node') {
        this.removeNode()
      }
    },
    removeEdge() {
      page.cy.getElementById(this.edgeEdit.formData.id).remove()
      console.log('removeEdge')
    },
    removeNode() {
      page.cy.getElementById(this.nodeEdit.formData.id).remove()
      console.log('removeNode')
    },
    submitEdges() {
      for (const key in this.nodeQuene) {
        if (Object.hasOwnProperty.call(this.nodeQuene, key)) {
          const nodeId = this.nodeQuene[key]
        }
      }
    },
    submitEdge() {
      switch (this.edgeEdit.status) {
        case 'edit':
          var edge = page.cy.getElementById(this.edgeEdit.formData.id)
          edge.move({
            source: this.edgeEdit.sourceNode,
            target: this.edgeEdit.targetNode
          })
          edge.data('level', this.edgeEdit.formData.level)
          edge.data('virtual', this.edgeEdit.formData.virtual)
          console.log('success to edit edge')
          break
        case 'add':
          this.addEdge(this.edgeEdit.sourceNode, this.edgeEdit.targetNode, this.edgeEdit.formData.level)
          break
        default:
          break
      }
    },
    submitNode() {
      switch (this.nodeEdit.status) {
        case 'edit':
          var node = page.cy.getElementById(this.nodeEdit.selectedNode)
          node.data('title', this.nodeEdit.formData.title)
          node.data('subtitle', this.nodeEdit.formData.subtitle)
          break
        default:
          break
      }
    },
    // 菜单的点击事件
    onSelect(item) {
      // 默认情况下点击选项时不会自动收起
      // 可以通过 close-on-click-action 属性开启自动收起
      this.showMenu = false
      // page.vue.$toast.success('操作成功！')
      // console.log(item.action)
      switch (item.action) {
        case 'import':
          load({ accept: '.json' }).then(file => {
            var reader = new FileReader()
            reader.readAsText(file, 'UTF-8')
            reader.onload = function (evt) {
              page.cy.add(JSON.parse(evt.target.result).elements)
              page.vue.$toast.success('载入成功。')
            }
            reader.onerror = function (evt) {
              page.vue.$toast.error('读取失败。')
            }
          })

          break
        case 'export':
          var j = JSON.parse(JSON.stringify(page.cy.json()))
          // 删掉那些乱七八糟的数据，规整一下
          var filterJ = function (j) {
            delete j['style']
            delete j['data']
            delete j['zoomingEnabled']
            delete j['userZoomingEnabled']
            delete j['zoom']
            delete j['minZoom']
            delete j['maxZoom']
            delete j['panningEnabled']
            delete j['userPanningEnabled']
            delete j['pan']
            delete j['boxSelectionEnabled']
            delete j['renderer']
            delete j['wheelSensitivity']

            for (let index = 0; index < j.elements.nodes.length; index++) {
              const element = j.elements.nodes[index]
              /*  delete element['group']
              delete element['removed']
              delete element['selected']
              delete element['selectable']
              delete element['locked']
              delete element['grabbable']
              delete element['pannable']
              delete element['classes'] */
              element['data']['id'] = parseInt(element['data']['id'])
            }
            for (let index = 0; index < j.elements.edges.length; index++) {
              const element = j.elements.edges[index]
              /*       delete element['group']
              delete element['removed']
              delete element['selected']
              delete element['selectable']
              delete element['locked']
              delete element['grabbable']
              delete element['pannable']
              delete element['classes']*/
              delete element['position'] 
              element['data']['id'] = parseInt(element['data']['id'])
              element['data']['source'] = parseInt(element['data']['source'])
              element['data']['target'] = parseInt(element['data']['target'])
              element['data']['virtual'] = parseInt(element['data']['virtual'] || 0)
              element['data']['level'] = parseInt(element['data']['level'] || 0)
            }
            return j
          }
          download('map.json', JSON.stringify(filterJ(j)))
          page.vue.$toast.success('导出成功。')

          break
        case 'clearCache':
          localStorage.removeItem('map')
          page.vue.$toast.success('已清空缓存。')

          break
        case 'saveToCache':
          localStorage.setItem('map', JSON.stringify(page.cy.json()))
          page.vue.$toast.success('已保存缓存。请及时导出，以免丢失。')
          break
        default:
          break
      }
    }
  },
  watch: {
    'edgeEdit.sourceNode': id => {
      var node = page.cy.getElementById(id)
      page.vue.edgeEdit.formData.source = node.position()
    },
    'edgeEdit.targetNode': id => {
      var node = page.cy.getElementById(id)
      page.vue.edgeEdit.formData.target = node.position()
    }
  },
  mounted() {
    document.addEventListener('keyup', evt => {
      console.log('event keyup', evt.code)
      // shift+delete key 删除

      if (evt.code == 'Delete') {
        this.deleteSelected()
      }
      // 按下 】 设置为虚拟道路
      if (evt.code == 'BracketRight') {
        this.edgeEdit.formData.virtual = '1'
        this.submitEdge()
      }
      // 按下 【 设置为自行车道路
      if (evt.code == 'BracketLeft') {
        this.edgeEdit.formData.level = '1'
        this.submitEdge()
      }
    })
    page.vue = this
    const background = new Image()
    background.onload = () => {
      const cy = (page.cy = cytoscape({
        container: document.getElementById('cy'),
        wheelSensitivity: 0.1,
        style: [
          {
            selector: 'node',
            css: {
              label: 'data(title)',
              'text-margin-y': '-15px',
              'background-color': this.config.defaultNodeColor,
              'font-size': '10px',
              height: '3px',
              width: '3px',
              'border-width': '1px'
            }
          },
          {
            selector: 'edge',
            css: {
              'line-color': ele => {
                var level = parseInt(ele.data('level'))
                var virtual = parseInt(ele.data('virtual'))
                if (virtual > 0) {
                  return '#5fde55'
                }
                if (level > 0) {
                  return '#fc5531'
                } else {
                  return '#ac1b69'
                }
              },
              width: 2,
              opacity: '1.0'
            }
          }
        ],
        elements: {
          nodes: [],
          edges: []
        },
        layout: {
          name: 'preset'
        }
      }))

      const bottomLayer = cy.cyCanvas({
        zIndex: -1
      })
      const canvas = bottomLayer.getCanvas()
      const ctx = canvas.getContext('2d')
      cy.animate(
        {
          pan: { x: 0, y: 0 },
          zoom: 1
        },
        {
          duration: 1000
        }
      )
      cy.on('render cyCanvas.resize', evt => {
        bottomLayer.resetTransform(ctx)
        bottomLayer.clear(ctx)
        bottomLayer.setTransform(ctx)

        ctx.save()
        // Draw a background
        ctx.drawImage(background, 0, 0)

        // Draw text that follows the model
        ctx.font = '14px Helvetica'
        ctx.fillStyle = 'black'
        ctx.fillText('This text follows the model', 200, 300)

        // // Draw shadows under nodes
        // ctx.shadowColor = 'black'
        // ctx.shadowBlur = 25 * cy.zoom()
        // ctx.fillStyle = 'white'
        // cy.nodes().forEach(node => {
        //   const pos = node.position()
        //   ctx.beginPath()
        //   ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI, false)
        //   ctx.fill()
        // })
        ctx.restore()

        // Draw text that is fixed in the canvas
        bottomLayer.resetTransform(ctx)
        ctx.save()
        ctx.font = '14px Helvetica'
        ctx.fillStyle = 'red'
        ctx.fillText('This text is fixed', 200, 200)
        ctx.restore()
      })
      // 读取本地缓存
      var cacheData = localStorage.getItem('map')
      if (cacheData) {
        cy.add(JSON.parse(cacheData).elements)
      }
      var lasttap = 0
      cy.on('tap', evt => {
        var node = evt.target
        // 如果按住 Ctrl，则键添加节点
        if (evt.originalEvent.ctrlKey) {
          console.log('add node')
          cy.add({
            group: 'nodes',
            data: { id: genId(), title: '', subtitle: '' },
            position: { x: parseInt(evt.position.x), y: parseInt(evt.position.y) }
          })
          console.log('node created')
          return
        }
        // 如果点击了背景，双击增加节点
        if (evt.target.constructor.name === 'Core') {
          // 停止连续连边
          this.nodePair.prevId = null
          // 停止删除
          this.lastSelectedType = null
          var deltaTime = +new Date() - lasttap
          lasttap = +new Date()
          if (deltaTime < 250) {
            console.log('double click!')
            console.log('add node')
            cy.add({
              group: 'nodes',
              data: { id: genId(), name: '' },
              position: { x: parseInt(evt.position.x), y: parseInt(evt.position.y) }
            })
            console.log('node created')
          }
          console.log('click on background')
          Object.assign(this.edgeEdit, {
            status: 'add',
            // 这是绑定到单选的模型
            // 表示下一个点作为起点还是终点，unknown: 未知，source: 起点，target 终点
            // 起点的 id
            sourceNode: null,
            // 终点的 id
            targetNode: null,
            // 起点和终点的坐标，仅仅作为展示使用
            formData: {
              id: null,
              source: { x: 0, y: 0 },
              target: { x: 0, y: 0 }
            }
          })
          Object.assign(this.nodeEdit, {
            // 节点只能编辑，因为通过 ctrl + 点击进行添加。
            status: 'edit',
            selectedNode: null,
            formData: {
              id: null,
              title: null,
              subtitle: null,
              position: { x: 0, y: 0 }
            }
          })
        }
      })
      // 如果点击了节点
      cy.on('tap', 'node', evt => {
        var node = evt.target
        this.nodePair.prevId = this.nodePair.curId
        this.nodePair.curId = node.id()
        // 按住 Shift 按键进行连续连线
        if (evt.originalEvent.shiftKey) {
          if (this.nodePair.prevId && this.nodePair.curId) {
            this.addEdge(this.nodePair.prevId, this.nodePair.curId)
          }
          //var selected = (this.nodeQuene[node.id()] = !this.nodeQuene[node.id()])
          //node.style('background-color', selected ? this.config.selectedNodeColor : this.config.defaultNodeColor)
          return
        }
        this.lastSelectedType = 'node'
        this.editorState = 'node'

        if (this.editorState == 'edge') {
          /* switch (this.edgeEdit.modifyingType) {
            case 'source':
              if (this.edgeEdit.targetNode == node.id()) {
                page.vue.$toast.error('起点不能和终点相同！')
                console.log('id: ', node.id())
                return
              }
              this.edgeEdit.sourceNode = node.id()
              console.log('sourceNode updated', this.edgeEdit.sourceNode)
              this.edgeEdit.modifyingType = 'target'
              break
            case 'target':
              if (this.edgeEdit.sourceNode == node.id()) {
                page.vue.$toast.error('终点不能和起点相同！')
                console.log('id: ', node.id())
                return
              }
              this.edgeEdit.targetNode = node.id()
              console.log('targetNode updated', this.edgeEdit.targetNode)

              this.edgeEdit.modifyingType = 'source'
              break
            default:
              break
          } */
        }

        if (this.editorState == 'node') {
          console.log(evt)
          this.nodeEdit.status = 'edit'
          this.nodeEdit.selectedNode = node.id()
          this.nodeEdit.formData.id = node.id()
          this.nodeEdit.formData.position.x = node.position().x
          this.nodeEdit.formData.position.y = node.position().y
          this.nodeEdit.formData.title = node.data('title')
          this.nodeEdit.formData.subtitle = node.data('subtitle')
          return
        }
      })
      // 如果点击了边
      cy.on('tap', 'edge', evt => {
        this.editorState = 'edge'
        this.lastSelectedType = 'edge'
        var edge = evt.target
        if (this.editorState == 'edge') {
          var level = parseInt(edge.data('level'))
          if (!level) {
            level = 0
          }
          var virtual = parseInt(edge.data('virtual'))
          if (!virtual) {
            virtual = 0
          }
          this.edgeEdit.status = 'edit'
          this.edgeEdit.formData.id = edge.id()
          this.edgeEdit.formData.level = level.toString()
          this.edgeEdit.formData.virtual = virtual.toString()
          this.edgeEdit.sourceNode = edge.source().id()
          this.edgeEdit.targetNode = edge.target().id()
        }
      })

      console.log(page.cy.json())
    }
    var imgs = {
      b2f1: 'https://z3.ax1x.com/2021/05/26/2pjudA.png',
      b2f2: 'https://z3.ax1x.com/2021/05/26/2pjQit.png',
      b1f1: 'https://z3.ax1x.com/2021/05/26/2pjeqH.png',
      b1f2: 'https://z3.ax1x.com/2021/05/26/2pjnZd.png',
      b1f3: 'https://z3.ax1x.com/2021/05/26/2pjKII.png'
    }
    var bgsrc = localStorage.getItem('bgsrc')
    if (!bgsrc) {
      bgsrc = 'https://z3.ax1x.com/2021/05/24/gvsj9e.png'
    }
    console.log('底图：', bgsrc)
    // Preload images
    background.src = bgsrc //'https://z3.ax1x.com/2021/05/24/gxub4O.png'
  }
}
</script>

<style>
#cy {
  width: 100%;
  height: 400px;
}
</style>