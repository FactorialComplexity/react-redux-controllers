import { connect } from "react-redux";
import { withController } from "./with";

class Mapper {
    constructor(mappings) {
        this.mappings = mappings.map((mapping) => {
            if (typeof mapping === "string") {
                return [{
                    controllerName: mapping,
                    prop: undefined,
                    mapStateToProps: (controller, state, ownProps) => controller.mapStateToProps(state, ownProps),
                    mapDispatchToProps: (controller, dispatch, ownProps) => controller.mapDispatchToProps(dispatch, ownProps)
                }];
            } else {
                const keys = Object.keys(mapping);
                return keys.map((controllerName) => {
                    mapping = mapping[controllerName];
                    
                    const overrideProps = { };
                    for (var propKey in mapping) {
                        if (!/^\$/.test(propKey)) {
                            overrideProps[propKey] = mapping[propKey];
                        }
                    }
                    
                    return {
                        controllerName,
                        prop: mapping.$prop,
                        mapStateToProps: mapping.$mapStateToProps ?
                            mapping.$mapStateToProps :
                            (controller, state, ownProps) => controller.mapStateToProps(state, ownProps, {
                                pickProps: mapping.$pickProps,
                                omitProps: mapping.$omitProps,
                                overrideProps
                            }),
                        mapDispatchToProps: mappings.$mapDispatchToProps ?
                            mapping.$mapDispatchToProps :
                            (controller, dispatch, ownProps) => controller.mapDispatchToProps(dispatch, ownProps, {
                                pickProps: mapping.$pickProps,
                                omitProps: mapping.$omitProps,
                                overrideProps
                            })
                    };
                });
            }
        }).reduce((acc, cur) => acc.concat(cur), []); // flatten array
    }
    
    controllersNames() {
        return this.mappings.map((mapping) => mapping.controllerName);
    }
    
    mapStateToProps(state, ownProps) {
        return this.mappings.reduce((result, mapping) => {
            const props = mapping.mapStateToProps(
                ownProps.controllers[mapping.controllerName],
                state,
                ownProps
            );
            
            if (mapping.prop) {
                Object.assign(result, { [mapping.prop]: props });
            } else {
                Object.assign(result, props);
            }
            
            return result;
        }, { });
    }
    
    mapDispatchToProps(dispatch, ownProps) {
        return this.mappings.reduce((result, mapping) => {
            const props = mapping.mapDispatchToProps(
                ownProps.controllers[mapping.controllerName],
                dispatch,
                ownProps
            );
            
            if (mapping.prop) {
                Object.assign(result, { [mapping.prop]: props });
            } else {
                Object.assign(result, props);
            }
            
            return result;
        }, { });
    }
}

export default function Container(WrappedComponent, ...mappings) {
    const mapper = new Mapper(mappings);
    
    return withController(connect(
        mapper.mapStateToProps.bind(mapper),
        mapper.mapDispatchToProps.bind(mapper)
    )(WrappedComponent), ...mapper.controllersNames());
}
