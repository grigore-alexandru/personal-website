import { ContentBlock, SubtitleBlock, BodyBlock, ListBlock, ImageBlock } from '../types';

function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createSubtitleBlock(): SubtitleBlock {
  return {
    id: generateId(),
    type: 'subtitle',
    content: '',
  };
}

export function createBodyBlock(): BodyBlock {
  return {
    id: generateId(),
    type: 'body',
    content: '',
  };
}

export function createListBlock(): ListBlock {
  return {
    id: generateId(),
    type: 'list',
    items: [''],
  };
}

export function createImageBlock(): ImageBlock {
  return {
    id: generateId(),
    type: 'image',
    url: '',
    alt: '',
  };
}

export function createBlock(type: ContentBlock['type']): ContentBlock {
  switch (type) {
    case 'subtitle':
      return createSubtitleBlock();
    case 'body':
      return createBodyBlock();
    case 'list':
      return createListBlock();
    case 'image':
      return createImageBlock();
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
}
