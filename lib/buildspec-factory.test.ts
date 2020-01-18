import {BuildSpecFactory} from "./buildspec-factory";

test("withoutLambda doesn't setup lambda artifacts", () => {
    const buildSpec = BuildSpecFactory.withoutLambda();
    expect(buildSpec).toBeDefined();
});
