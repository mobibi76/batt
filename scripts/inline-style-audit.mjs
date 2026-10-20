import ts from 'typescript';

export const runtimeProperties = new Set([
  '--guide-x','--guide-y','--guide-w','--guide-h','--bar-ratio','--spread-width',
  '--timeline-start','--timeline-width','--scene-x','--scene-y',
  '--capture-x','--capture-y','--capture-width','--capture-height',
  '--capture-marker-x','--capture-marker-y',
]);

// Resolve local aliases as well as direct JSX objects; regex-only checks miss style={alias}.
export function auditInlineStyles(text, file='component.tsx') {
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declarations=new Map(),errors=[];
  const visit=(node,fn)=>{fn(node);ts.forEachChild(node,n=>visit(n,fn));};
  visit(source,node=>{if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)declarations.set(node.name.text,node.initializer);});
  const unwrap=node=>ts.isAsExpression(node)||ts.isParenthesizedExpression(node)||ts.isSatisfiesExpression(node)?unwrap(node.expression):node;
  function dynamic(node,seen=new Set()) {
    node=unwrap(node);
    if(ts.isIdentifier(node)) {
      if(['undefined','NaN','Infinity'].includes(node.text)||seen.has(node.text))return false;
      const value=declarations.get(node.text);
      return value?dynamic(value,new Set([...seen,node.text])):true;
    }
    if(ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node))return true;
    let result=false;ts.forEachChild(node,child=>{if(dynamic(child,seen))result=true;});return result;
  }
  function object(node,seen=new Set()) {
    node=unwrap(node);
    if(node.kind===ts.SyntaxKind.NullKeyword||ts.isIdentifier(node)&&node.text==='undefined')return;
    if(ts.isIdentifier(node)&&declarations.has(node.text)&&!seen.has(node.text))return object(declarations.get(node.text),new Set([...seen,node.text]));
    if(ts.isConditionalExpression(node)){object(node.whenTrue,seen);object(node.whenFalse,seen);return;}
    if(!ts.isObjectLiteralExpression(node)){errors.push(`${file}: unresolved inline style; use a class or explicit runtime variables`);return;}
    for(const property of node.properties) {
      const name=property.name&&(ts.isStringLiteral(property.name)||ts.isIdentifier(property.name))?property.name.text:'';
      if(!ts.isPropertyAssignment(property)||!runtimeProperties.has(name)||!dynamic(property.initializer))
        errors.push(`${file}: inline style ${name||'(spread/computed)'} is not registered runtime geometry`);
    }
  }
  visit(source,node=>{
    if(ts.isJsxAttribute(node)&&node.name.getText(source)==='style') {
      if(node.initializer&&ts.isJsxExpression(node.initializer)&&node.initializer.expression)object(node.initializer.expression);
      else errors.push(`${file}: literal style attribute`);
    }
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&/\.style(?:\.|\[|$)/.test(node.left.getText(source)))
      errors.push(`${file}: imperative style assignment; use a class or runtime setProperty`);
    if(ts.isCallExpression(node)&&/\.style\.setProperty$/.test(node.expression.getText(source))) {
      const [name,value]=node.arguments;
      if(!name||!ts.isStringLiteral(name)||!runtimeProperties.has(name.text)||!value||!dynamic(value))
        errors.push(`${file}: setProperty is not registered runtime geometry`);
    }
  });
  return errors;
}
