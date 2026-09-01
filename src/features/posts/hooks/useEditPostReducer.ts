import { useReducer } from 'react';
import { EditUploadItem } from './useEditPost';

export interface EditPostState {
  title: string;
  caption: string;
  items: EditUploadItem[];
  isUploading: boolean;
  uploadProgress: number | null;
  showDiscardConfirm: boolean;
  errorMsg: string;
  isDragOver: boolean;
}

export type EditPostAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_CAPTION'; payload: string }
  | { type: 'SET_ITEMS'; payload: EditUploadItem[] | ((prev: EditUploadItem[]) => EditUploadItem[]) }
  | { type: 'SET_DRAG_OVER'; payload: boolean }
  | { type: 'START_UPLOAD' }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'UPLOAD_ERROR'; payload: string }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'SET_DISCARD_CONFIRM'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

const initialState: EditPostState = {
  title: '',
  caption: '',
  items: [],
  isUploading: false,
  uploadProgress: null,
  showDiscardConfirm: false,
  errorMsg: '',
  isDragOver: false,
};

function editPostReducer(state: EditPostState, action: EditPostAction): EditPostState {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.payload, errorMsg: '' };
    case 'SET_CAPTION':
      return { ...state, caption: action.payload, errorMsg: '' };
    case 'SET_ITEMS':
      return {
        ...state,
        items: typeof action.payload === 'function' ? action.payload(state.items) : action.payload,
      };
    case 'SET_DRAG_OVER':
      return { ...state, isDragOver: action.payload };
    case 'START_UPLOAD':
      return { ...state, isUploading: true, uploadProgress: 0, errorMsg: '' };
    case 'SET_PROGRESS':
      return { ...state, uploadProgress: action.payload };
    case 'UPLOAD_SUCCESS':
      return { ...state, isUploading: false, uploadProgress: null };
    case 'UPLOAD_ERROR':
      return { ...state, isUploading: false, uploadProgress: null, errorMsg: action.payload };
    case 'CANCEL_UPLOAD':
      return { ...state, isUploading: false, uploadProgress: null, errorMsg: 'Upload was canceled.' };
    case 'SET_DISCARD_CONFIRM':
      return { ...state, showDiscardConfirm: action.payload };
    case 'SET_ERROR':
      return { ...state, errorMsg: action.payload };
    default:
      return state;
  }
}

export function useEditPostReducer(initial?: Partial<EditPostState>) {
  return useReducer(editPostReducer, { ...initialState, ...initial });
}
