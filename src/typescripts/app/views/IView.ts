export = IView;

interface IView {
    name: string;
    setup(): Q.Promise<IView>;
    hide(): Q.Promise<void>;
    show(): Q.Promise<void>;
    bindEvents(): void;
}