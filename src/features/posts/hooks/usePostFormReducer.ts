import { useReducer } from 'react';
import type { PostMedia } from '../types';

export interface PostFormState {
  title: string;
  caption: string;
  isUploading: boolean;
  uploadProgress: number | null;
  showDiscardConfirm: boolean;
  errorMsg: string;
}

export type PostFormAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_CAPTION'; payload: string }
  | { type: 'START_UPLOAD' }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'UPLOAD_ERROR'; payload: string }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'SET_DISCARD_CONFIRM'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

const initialState: PostFormState = {
  title: '',
  caption: '',
  isUploading: false,
  uploadProgress: null,
  showDiscardConfirm: false,
  errorMsg: '',
};

function postFormReducer(state: PostFormState, action: PostFormAction): PostFormState {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.payload, errorMsg: '' };
    case 'SET_CAPTION':
      return { ...state, caption: action.payload, errorMsg: '' };
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

export function usePostFormReducer(initial?: Partial<PostFormState>) {
  return useReducer(postFormReducer, { ...initialState, ...initial });
}
