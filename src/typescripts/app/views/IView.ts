/// <reference path='../../dts/Q.d.ts'/>

export = IView;

interface IView {
    name: string;
    setup(): Q.Promise<void>;
    hide(): Q.Promise<void>;
    show(): Q.Promise<void>;
    reset(): void;
    bindEvents(): void;
}