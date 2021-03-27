<template>
  <div class="geditor">
    <van-nav-bar title="地图编辑器">
      <template #right>
        <v-icon name="ellipsis-v" @click="showMenu = true" />
      </template>
    </van-nav-bar>
    <van-action-sheet v-model="showMenu" :actions="menuActions" @select="onSelect" />

    <div id="cy"></div>
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

          <van-field name="radio" label="修改目标：">
            <template #input>
              <van-radio-group v-model="edgeEdit.modifyingType" direction="horizontal">
                <van-radio name="source">起点</van-radio>
                <van-radio name="target">终点</van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>

        <div class="btn-margin">
          <van-button block type="primary" @click="submitEdge()">
            <span v-if="edgeEdit.status === 'add'">添加</span>
            <span v-if="edgeEdit.status === 'edit'">编辑</span>
          </van-button>
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
import { snowflake } from '../../utils/snowflake'

// 实现导出 json 到浏览器，下载到本地的功能
import { download, load } from '../../utils/file'

cyCanvas(cytoscape) // Register extension

// 存放一些页面全局对象，避开 this 指针指向与预期不一致的情况。
var page = {
  vue: null,
  // 不要用 data 存放，否则页面会卡死
  cy: null
}
window.pageData = page
export default {
  data() {
    return {
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
      // 节点队列，用于批量创建
      nodeQuene:[],
      // 正在编辑的标签页是什么, edge: 路径
      editorState: 'edge',
      // 路径编辑标签页
      edgeEdit: {
        status: 'add',
        // 这是绑定到单选的模型
        // 表示下一个点作为起点还是终点，unknown: 未知，source: 起点，target 终点
        modifyingType: 'unknown',
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
      },
      nodeEdit: {
        // 节点只能编辑，因为通过 ctrl + 点击进行添加。
        status: 'edit',
        modifyingType: 'unknown',
        selectedNode: null,
        formData: {
          id: null,
          title: null,
          subtitle: null,
          position: { x: 0, y: 0 }
        }
      }
    }
  },
  methods: {
    // 在两个节点之间添加路径
    addEdge(sourceId, targetId) {},
    addNode() {},
    removeEdge() {
      page.cy.getElementById(this.edgeEdit.formData.id).remove()
    },
    removeNode() {
      page.cy.getElementById(this.nodeEdit.formData.id).remove()
    },
    submitEdge() {
      switch (this.edgeEdit.status) {
        case 'edit':
          var edge = page.cy.getElementById(this.edgeEdit.formData.id)
          edge.move({
            source: this.edgeEdit.sourceNode,
            target: this.edgeEdit.targetNode
          })
          break
        case 'add':
          console.log('add edge from ', this.edgeEdit.sourceNode, 'to', this.edgeEdit.targetNode)
          page.cy.add({
            group: 'edges',
            data: {
              id: snowflake(),
              source: this.edgeEdit.sourceNode,
              target: this.edgeEdit.targetNode
            }
          })
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
          download('data.json', JSON.stringify(page.cy.json()))
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
              'background-color': 'black',
              'font-size': '32px',
              height: '8px',
              width: '8px',
              'border-width': '1px'
            }
          },
          {
            selector: 'edge',
            css: {
              'line-color': '#ac1b69',
              opacity: '0.5'
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
          pan: { x: -472.5, y: -1080.5 },
          zoom: 0.5
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

        // Draw shadows under nodes
        ctx.shadowColor = 'black'
        ctx.shadowBlur = 25 * cy.zoom()
        ctx.fillStyle = 'white'
        cy.nodes().forEach(node => {
          const pos = node.position()
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI, false)
          ctx.fill()
        })
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

      cy.on('tap', evt => {
        var node = evt.target
        // 按住 Ctrl 键添加节点
        if (evt.originalEvent.ctrlKey) {
          console.log('add node')
          cy.add({
            group: 'nodes',
            data: { id: snowflake(), name: '' },
            position: { x: parseInt(evt.position.x), y: parseInt(evt.position.y) }
          })
          console.log('node created')
          return
        }
        if (evt.target.constructor.name === 'Core') {
          console.log('click on background')
          Object.assign(this.edgeEdit, {
            status: 'add',
            // 这是绑定到单选的模型
            // 表示下一个点作为起点还是终点，unknown: 未知，source: 起点，target 终点
            modifyingType: 'unknown',
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
            modifyingType: 'unknown',
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
      cy.on('tap', 'node', evt => {
        var node = evt.target

        if (this.editorState == 'edge') {
          switch (this.edgeEdit.modifyingType) {
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
          }
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
      cy.on('tap', 'edge', evt => {
        var edge = evt.target
        if (this.editorState == 'edge') {
          this.edgeEdit.status = 'edit'
          this.edgeEdit.formData.id = edge.id()
          this.edgeEdit.sourceNode = edge.source().id()
          this.edgeEdit.targetNode = edge.target().id()
        }
      })

      console.log(page.cy.json())
    }

    // Preload images
    background.src = 'https://cdn.jsdelivr.net/gh/pluveto/0images/picgo123.png'
  }
}
</script>

<style>
#cy {
  width: 100%;
  height: 400px;
}
</style>