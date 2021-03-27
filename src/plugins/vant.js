// 按需全局引入 vant组件
import Vue from 'vue'
import { Button, List, Cell, Tabbar, TabbarItem, Field, Tabs, Tab, Form, Collapse, CollapseItem, Row, Col, CellGroup, Radio, RadioGroup, NavBar, Icon, Popup, ActionSheet } from 'vant'
Vue.use(Row).use(Col)
Vue.use(Button)
Vue.use(Cell).use(CellGroup)
Vue.use(List)
Vue.use(Form)
Vue.use(Collapse).use(CollapseItem)
Vue.use(Field)
Vue.use(Tabs).use(Tab)
Vue.use(Tabbar).use(TabbarItem)
Vue.use(Radio).use(RadioGroup)
Vue.use(NavBar)
Vue.use(Icon)
Vue.use(Popup)
Vue.use(ActionSheet)