import { NativeModules } from 'react-native';
import { ClearBr } from './utils';
import Node from './node';
import nodeStyle from '../style/node.style';
import command from './command';
import options from './options';

//获取文字宽度
const testLength = NativeModules.TestLength;
//切分文字
const splitText = NativeModules.SplitTextByWidth;

let algorithm = {};

export const register = (name, obj) => {
  algorithm[name] = obj;
}

export class NodeTree {
  constructor(nodeData) {
    this._root = this.createNode(nodeData, null);
    this.importNode(this._root, nodeData);

    //计算节点大小和位置
    this.calcPosition();
    this.chooseLayout = this.chooseLayout.bind(this);
    this.chooseLayout(options.get('layout'));
  }

  /**
   * 选择节点布局
   * @param {*} mode
   */
  chooseLayout(mode) {
    this.layout = algorithm[mode];
  }

  /**
   * 获取根节点
   */
  get root() {
    return this._root;
  }

  /**
   * 获取所有节点
   */
  get allNode() {
    var nodes = [];
    this.root.traverse(function (node) {
      nodes.push(node);
    });
    return nodes;
  }

  /**
   * 初始化所有节点
   */
  initAllNode() {
    this.allNode.forEach((node) => {
      node.init();
    });
  }

  /**
   * 递归导入节点数据
   * @param {*} node
   * @param {*} json
   */
  importNode(node, json) {
    var data = json.data;
    node.data = {};

    for (var field in data) {
      node.setData(field, data[field]);
    }

    var childrenTreeData = json.children || [];
    for (var i = 0; i < childrenTreeData.length; i++) {
      var childNode = this.createNode(null, node);
      this.importNode(childNode, childrenTreeData[i]);
    }
    return node;
  }

  /**
   * 初始化 node 对象
   * @param {*} data
   * @param {*} parent
   */
  createNode(data, parent) {
    const node = new Node(data);
    this.appendNode(node, parent);
    return node;
  }

  /**
   * 追加 node 对象
   * @param {*} node
   * @param {*} parent
   */
  appendNode(node, parent) {
    if (parent) {
      parent.insertChild(node);
    }
    return this;
  }

  /**
   * 布局是否重叠
   * @return {boolean}
   */
  layoutIsOverlap() {
    for (let i = 0, iEnd = this.allNode.length; i < iEnd; i++) {
      let node = this.allNode[i];
      for (let j = 0; j < iEnd; j++) {
        let node1 = this.allNode[j];
        if (i === j) {
          break;
        }

        if (node.overlap(node1)[0]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 计算节点位置
   */
  calcPosition() {
    let promiseList = [];

    this.initAllNode();

    //计算标题所占长度与高度
    this.allNode.forEach((node) => {
      let p = new Promise((resolve, reject) => {
        //去除空格
        node.data.title = ClearBr(node.data.title);
        if (node.data.title === '') {
          node.data.title = '分支主题';
        }

        testLength.processString(
          node.data.title,
          {
            font: 'Heiti SC',
            fontSize: node.style.title.fontSize,
          },
          {
            width: 400,
            height: 50,
          },
          (error, w, h) => {
            node.titleBox.width =
              Number(w) + nodeStyle.paddingLeft + nodeStyle.paddingRight;
            resolve();
          }
        );
      });
      promiseList.push(p);

      // 切分标题
      if (node.data.content_type === 'content.builtin.title') {
        node.data.titleList = [];

        let p1 = new Promise((resolve, reject) => {
          splitText.processString(
            node.data.title,
            {
              font: 'Heiti SC',
              fontSize: node.style.title.fontSize,
            },
            {
              width: nodeStyle.content.content.singleWidth,
              height: 50,
            },
            (error, textList) => {
              let tempTextList = textList;
              if (
                !Array.isArray(tempTextList) &&
                typeof tempTextList == 'string'
              ) {
                tempTextList = textList.split(',');
              }
              node.data.titleList = tempTextList.filter((item) => {
                return item !== '';
              });
              resolve();
            }
          );
        });

        promiseList.push(p1);
      }

      //切分文件标题
      /**
       * 文件格式
       * '[{"file_name": "测试文件标题"}]'
       */
      if (node.data.content_type === 'content.builtin.attachment') {
        node.data.fileNameList = [];
        if (
          node.data.content &&
          Array.isArray(node.serializeContent) &&
          node.serializeContent.length
        ) {
          //去除空格
          node.serializeContent[0].file_name = ClearBr(
            node.serializeContent[0].file_name
          );
          let p2 = new Promise((resolve, reject) => {
            splitText.processString(
              node.serializeContent[0].file_name,
              {
                font: 'Heiti SC',
                fontSize: node.style.title.fontSize,
              },
              {
                width: node.style.fileName.width,
                height: 50,
              },
              (error, textList) => {
                let tempTextList = textList;
                if (
                  !Array.isArray(tempTextList) &&
                  typeof tempTextList == 'string'
                ) {
                  tempTextList = textList.split(',');
                }
                node.data.fileNameList = tempTextList;
                resolve();
              }
            );
          });
          promiseList.push(p2);
        }
      }

      //切分正文
      if (node.data.content_type === 'content.builtin.text') {
        node.data.contentList = [];
        if (node.data.content && node.data.content.length) {
          //去除空格
          node.data.content = ClearBr(node.data.content);
          let p3 = new Promise((resolve, reject) => {
            splitText.processString(
              node.data.content,
              {
                font: 'Heiti SC',
                fontSize: node.style.text.fontSize,
              },
              {
                width: node.style.text.width,
                height: 50,
              },
              (error, textList) => {
                let tempTextList = textList;
                if (
                  !Array.isArray(tempTextList) &&
                  typeof tempTextList == 'string'
                ) {
                  tempTextList = textList.split(',');
                }
                node.data.contentList = tempTextList.filter((item) => {
                  return item !== '';
                });
                resolve();
              }
            );
          });
          promiseList.push(p3);
        }
      }
    });

    Promise.all(promiseList).then(() => {
      //计算内容所占大小
      this.allNode.forEach((node) => {
        let style = node.style;
        switch (node.data.content_type) {
          case 'content.builtin.image':
            node.contentBox.width =
              ((node.data.content ? node.serializeContent.length : 0) + 1) *
                (style.content.singleWidth + style.content.marginLeft) -
              style.content.marginLeft +
              style.content.paddingLeft +
              style.content.paddingRight +
              2 * style.content.x;
            node.contentBox.height =
              style.content.singleHeight +
              style.content.paddingTop +
              style.content.paddingBottom +
              style.content.y;
            break;
          case 'content.builtin.attachment':
            node.contentBox.width =
              style.content.singleWidth +
              style.content.paddingLeft +
              style.content.paddingRight +
              2 * style.content.x +
              10;
            node.contentBox.height =
              (node.data.fileNameList.length > 2
                ? nodeStyle.file.fileName.fontSize *
                  node.data.fileNameList.length
                : style.content.singleHeight) +
              style.content.paddingTop +
              style.content.paddingBottom +
              style.content.y;
            break;
          case 'content.builtin.text':
            node.contentBox.width =
              style.content.singleWidth +
              style.content.paddingLeft +
              style.content.paddingRight +
              2 * style.content.x;
            node.contentBox.height =
              style.content.singleHeight * node.data.contentList.length +
              style.content.paddingTop +
              style.content.paddingBottom +
              style.content.y;
            break;
          case 'content.builtin.title':
            // 判断如果文字宽度大于最大宽度则需要换行处理
            const tempWidth =
              node.titleBox.width > nodeStyle.content.content.singleWidth
                ? nodeStyle.content.content.singleWidth + nodeStyle.paddingLeft + nodeStyle.paddingRight
                : node.titleBox.width;
            node.titleBox.width = tempWidth;
            node.titleBox.height =
              nodeStyle.content.content.singleHeight *
                node.data.titleList.length +
              nodeStyle.paddingTop +
              nodeStyle.paddingBottom;
            break;
        }
      });

      //强制节点刷新
      this.allNode.forEach((node) => {
        node._chenged = true;
      });

      this.layout.init.bind(this)();
      command.exec('layout', this.root.data.node_id);
    });
  }
}
