---
title: "随机过程 CHEATSHEET"
slug: "随机过程-cheatsheet"
date: "2026-10-04"
lastEditedTime: "2026-10-06T07:49:00.000Z"
renderVersion: "8"
category: "study"
tags: ["study","notes"]
status: "Published"
notionPageId: "3efdb726-82a8-81ce-9a32-e06acb71f32f"
---

> 基于两份课程讲义整理。先查定义与成立条件，再查公式；分布参数约定见 1\.3。

> 记号：所有随机变量定义在概率空间 \((\Omega,\mathcal F,P)\) 上；\(E|X|<\infty\) 表示 \(X\) 可积；\(L^r\) 讨论取 \(r\ge1\)。除特别说明外，等式中的条件期望均按“几乎处处相等”理解。\(D(X)=\operatorname{Var}(X)\)。

## 1\.1 概率空间与 \(\sigma\)\-代数

- **概率空间** \((\Omega,\mathcal F,P)\)：\(\Omega\) 是所有可能结果组成的**样本空间**；\(A\subseteq\Omega\) 是**事件**，可赋予概率的事件属于**事件域** \(\mathcal F\)；\(P:\mathcal F\to[0,1]\) 是概率测度。
- \(\sigma\)**\-代数三条定义**：① \(\Omega\in\mathcal F\)；② \(A\in\mathcal F\Rightarrow A^c\in\mathcal F\)；③ \(A_n\in\mathcal F\ (n\ge1)\Rightarrow\bigcup_{n=1}^\infty A_n\in\mathcal F\)。由此也对可数交封闭，且 \(\varnothing\in\mathcal F\)。
- **生成 **\(\sigma\)**\-代数**：\(\sigma(\mathcal C)=\bigcap\{\mathcal G:\mathcal G\text{ 是包含 }\mathcal C\text{ 的 }\sigma\text{-代数}\}\)，即包含 \(\mathcal C\) 的最小 \(\sigma\)\-代数。
- **Borel **\(\sigma\)**\-代数**：\(\mathcal B(\mathbb R)=\sigma(\{(a,b):a<b\})\)；\(\mathcal B(S)\) 是空间 \(S\) 中所有开集生成的 \(\sigma\)\-代数。
- **信息解释**：\(\mathcal G\subseteq\mathcal F\) 表示只知道 \(\mathcal G\) 中事件是否发生；\(\mathcal G_1\subseteq\mathcal G_2\) 表示后者信息更多。平凡 \(\sigma\)\-代数 \(\{\varnothing,\Omega\}\) 没有非平凡信息；\(\sigma(X)\) 是观察 \(X\) 后可判定的全部事件。
## 1\.2 概率运算、条件概率与独立性

- **Kolmogorov 三公理**：\(P(A)\ge0\)；\(P(\Omega)=1\)；两两不交的 \(A_n\) 满足 \(P(\bigcup_n A_n)=\sum_nP(A_n)\)。推论：\(P(A^c)=1-P(A)\)，\(A\subseteq B\Rightarrow P(A)\le P(B)\)。
- **加法与容斥**：\(P(A\cup B)=P(A)+P(B)-P(A\cap B)\)；\(P(\bigcup_{i=1}^nA_i)=\sum_{\varnothing\ne J\subseteq\{1,\ldots,n\}}(-1)^{|J|+1}P(\bigcap_{j\in J}A_j)\)。
- **条件概率与乘法**：\(P(A\mid B)=P(A\cap B)/P(B)\)，要求 \(P(B)>0\)；故 \(P(A\cap B)=P(A\mid B)P(B)\)。若 \(B_1,\ldots,B_n\) 构成划分且 \(P(B_i)>0\)，则 \(P(A)=\sum_iP(A\mid B_i)P(B_i)\)。
- **事件独立**：\(A,B\) 独立当且仅当 \(P(A\cap B)=P(A)P(B)\)。事件族 \(\{A_i\}\) **相互独立**指任意有限个不同下标 \(i_1,\ldots,i_k\) 均满足 \(P(\bigcap_{j=1}^kA_{i_j})=\prod_{j=1}^kP(A_{i_j})\)；仅两两独立不够。
- \(\sigma\)**\-代数独立**：\(\mathcal G_1,\ldots,\mathcal G_n\) 独立，指任取 \(A_i\in\mathcal G_i\)，\(P(\bigcap_iA_i)=\prod_iP(A_i)\)；无限族要求每个有限子族都独立。随机变量独立等价于它们生成的 \(\sigma\)\-代数独立。
## 1\.3 随机变量与分布

- **可测性**：\(X:\Omega\to\mathbb R\) 是随机变量，当且仅当 \(\{X\le x\}\in\mathcal F\) 对每个 \(x\in\mathbb R\) 成立；等价于 \(X^{-1}(B)\in\mathcal F\) 对每个 \(B\in\mathcal B(\mathbb R)\) 成立。\(\sigma(X)=\{X^{-1}(B):B\in\mathcal B(\mathbb R)\}\)。
- **分布函数**：\(F_X(x)=P(X\le x)\)。它单调不减、右连续，且 \(F_X(-\infty)=0\)、\(F_X(+\infty)=1\)；\(P(a<X\le b)=F_X(b)-F_X(a)\)，\(P(X=x)=F_X(x)-F_X(x^-)\)。
- **离散型**：概率质量函数 \(p_X(x)=P(X=x)\)，\(p_X\ge0\)、\(\sum_xp_X(x)=1\)。**连续型**：若存在密度 \(f_X\ge0\)，则 \(F_X(x)=\int_{-\infty}^xf_X(u)\,du\)、\(\int_{\mathbb R}f_X=1\)、\(P(X=x)=0\)。一般分布未必仅属这两类。
- **\-\-\-\|\-\-\-\|\-\-\-\|\-\-\-**：
- ** Bernoulli**\((p)\)：\(k=0,1\)；\(p^k(1-p)^{1-k}\)；\(p\)；\(p(1-p)\) 
- ** Binomial**\((n,p)\)：\(k=0,\ldots,n\)；\(\binom nkp^k(1-p)^{n-k}\)；\(np\)；\(np(1-p)\) 
- ** Geometric**\((p)\)**（首次成功所需次数）**：\(k=1,2,\ldots\)；\((1-p)^{k-1}p\)；\(1/p\)；\((1-p)/p^2\) 
- ** Poisson**\((\lambda)\)：\(k=0,1,\ldots\)；\(e^{-\lambda}\lambda^k/k!\)；\(\lambda\)；\(\lambda\) 
- ** Uniform**\((a,b)\)：\(a<x<b\)；\(1/(b-a)\)；\((a+b)/2\)；\((b-a)^2/12\) 
- ** Exponential**\((\lambda)\)**（rate）**：\(x\ge0\)；\(\lambda e^{-\lambda x}\)；\(1/\lambda\)；\(1/\lambda^2\) 
- ** Normal**\((\mu,\sigma^2)\)：\(x\in\mathbb R\)；\(e^{-(x-\mu)^2/(2\sigma^2)}/(\sigma\sqrt{2\pi})\)；\(\mu\)；\(\sigma^2\) 
- ** Gamma**\((\alpha,\beta)\)**（shape、rate）**：\(x>0\)；\(\beta^\alpha x^{\alpha-1}e^{-\beta x}/\Gamma(\alpha)\)；\(\alpha/\beta\)；\(\alpha/\beta^2\) 
其中 \(0<p<1\)、\(n\in\mathbb N\)、\(\lambda,\alpha,\beta,\sigma>0\)、\(a<b\)；\(\Gamma(\alpha)=\int_0^\infty t^{\alpha-1}e^{-t}\,dt\)。

## 1\.4 多维随机变量与条件分布

- **随机向量** \(\boldsymbol X=(X_1,\ldots,X_n)\) 的联合分布函数：\(F_{\boldsymbol X}(x_1,\ldots,x_n)=P(X_1\le x_1,\ldots,X_n\le x_n)\)。边缘分布由其他坐标令趋于 \(+\infty\) 得到；二维情形 \(F_X(x)=\lim_{y\to\infty}F_{X,Y}(x,y)\)。
- **联合 / 边缘密度**：\(P((X,Y)\in C)=\iint_C f_{X,Y}(x,y)\,dx\,dy\)；\(f_X(x)=\int_{\mathbb R}f_{X,Y}(x,y)\,dy\)，\(f_Y(y)=\int_{\mathbb R}f_{X,Y}(x,y)\,dx\)。
- **条件分布**：离散型 \(P(X=x\mid Y=y)=p_{X,Y}(x,y)/p_Y(y)\)，要求 \(p_Y(y)>0\)；连续型 \(f_{X\mid Y}(x\mid y)=f_{X,Y}(x,y)/f_Y(y)\)，在 \(f_Y(y)>0\) 的点成立，\(F_{X\mid Y}(x\mid y)=\int_{-\infty}^x f_{X\mid Y}(u\mid y)\,du\)。连续型中 \(P(Y=y)=0\)，不能直接用事件条件概率的比值。
- **独立性判别**：\(F_{X,Y}(x,y)=F_X(x)F_Y(y)\) 对所有 \(x,y\) 成立；有联合密度时等价于 \(f_{X,Y}(x,y)=f_X(x)f_Y(y)\) 几乎处处。\(n\) 维情形要求联合分布分解为全部边缘分布的乘积。
- **顺序统计量**：若 \(X_1,\ldots,X_n\) 独立同分布且有连续密度 \(f\)、分布函数 \(F\)，排序为 \(X_{(1)}\le\cdots\le X_{(n)}\)，则
$$f_{X_{(1)},\ldots,X_{(n)}}(x_1,\ldots,x_n)=n!\prod_{i=1}^nf(x_i)\,\mathbf1_{\{x_1<\cdots<x_n\}}.$$

第 \(k\) 个顺序统计量的密度：\(f_{X_{(k)}}(x)=\dfrac{n!}{(k-1)!(n-k)!}F(x)^{k-1}[1-F(x)]^{n-k}f(x)\)。

## 1\.5 数字特征与特征函数

- **期望**：离散型 \(E[g(X)]=\sum_xg(x)p_X(x)\)；连续型 \(E[g(X)]=\int g(x)f_X(x)\,dx\)；存在条件是 \(E|g(X)|<\infty\)（非负函数可取 \(+\infty\)）。\(E(aX+bY)=aEX+bEY\)。
- **方差与矩**：\(D(X)=E[(X-EX)^2]=E(X^2)-(EX)^2\)；\(k\) 阶原点矩 \(E(X^k)\)，\(k\) 阶中心矩 \(E[(X-EX)^k]\)。\(D(aX+b)=a^2D(X)\)。
- **协方差与相关系数**：\(\operatorname{Cov}(X,Y)=E[(X-EX)(Y-EY)]=E(XY)-EX\,EY\)；\(D(X+Y)=D(X)+D(Y)+2\operatorname{Cov}(X,Y)\)；\(\rho_{X,Y}=\operatorname{Cov}(X,Y)/(\sqrt{D(X)D(Y)})\)，要求方差均正。独立推出协方差为 \(0\)，反向一般不成立。
- **Cauchy–Schwarz**：\(|E(XY)|^2\le E(X^2)E(Y^2)\)；因此 \(|\operatorname{Cov}(X,Y)|\le\sqrt{D(X)D(Y)}\)，\(|\rho_{X,Y}|\le1\)。
- **特征函数**：\(\varphi_X(t)=E(e^{itX})\)，\(t\in\mathbb R\)；总是存在，\(\varphi_X(0)=1\)、\(|\varphi_X(t)|\le1\)、\(\varphi_X(-t)=\overline{\varphi_X(t)}\)，且它唯一确定分布。若 \(E|X|^k<\infty\)，则 \(\varphi_X^{(k)}(0)=i^kE(X^k)\)。
- **独立和**：\(X,Y\) 独立时 \(\varphi_{X+Y}(t)=\varphi_X(t)\varphi_Y(t)\)。若 \(\varphi_X\in L^1(\mathbb R)\)，则 \(X\) 有连续密度，Fourier 反演为 \(f_X(x)=\dfrac1{2\pi}\int_{-\infty}^{\infty}e^{-itx}\varphi_X(t)\,dt\)。
## 1\.6 随机变量序列的收敛

- **\-\-\-\|\-\-\-\|\-\-\-**：
- ** 依分布 **\(X_n\xrightarrow{d}X\)：\(F_{X_n}(x)\to F_X(x)\)，对 \(F_X\) 的每个连续点 \(x\)；\(X_n\) 可位于不同概率空间 
- ** 几乎处处 **\(X_n\xrightarrow{a.s.}X\)：\(P(\{\omega:X_n(\omega)\to X(\omega)\})=1\)；路径级收敛 
- ** 依概率 **\(X_n\xrightarrow{P}X\)：任意 \(\varepsilon>0\)，\(P(|X_n-X|>\varepsilon)\to0\)；偏差概率趋零 
- ** **\(L^r\)** **\(X_n\xrightarrow{L^r}X\)：\(E|X_n-X|^r\to0\)；需在同一空间，且相应矩存在 
**关系图**：\(L^r\Rightarrow P\Rightarrow d\)，\(a.s.\Rightarrow P\Rightarrow d\)；\(r>s\ge1\) 时 \(L^r\Rightarrow L^s\)。其余逆向一般不成立。若 \(X_n\xrightarrow d c\) 且极限 \(c\) 为常数，则 \(X_n\xrightarrow P c\)。

## 1\.7 收敛工具与极限定理

- **Borel–Cantelli**：令 \(\limsup A_n=\bigcap_m\bigcup_{n\ge m}A_n\) 表示“无穷多次发生”。若 \(\sum_nP(A_n)<\infty\)，则 \(P(\limsup A_n)=0\)；若 \(A_n\) 相互独立且 \(\sum_nP(A_n)=\infty\)，则 \(P(\limsup A_n)=1\)。
- **子列原理**：\(X_n\xrightarrow P X\) 当且仅当任意子列都存在进一步子列几乎处处收敛于 \(X\)。特别地，可选 \(n_k\) 使 \(P(|X_{n_k}-X|>2^{-k})<2^{-k}\)，再用 Borel–Cantelli。
- **Chebyshev / Markov**：\(P(|X-EX|\ge\varepsilon)\le D(X)/\varepsilon^2\)；\(Z\ge0\) 时 \(P(Z\ge a)\le EZ/a\)。因此 \(L^2\) 收敛推出依概率收敛。
- \(L^2\)**\-Cauchy 判别**：\(X_n\) 在 \(L^2\) 收敛，当且仅当 \(E|X_n-X_m|^2\to0\)（\(m,n\to\infty\)）；依赖 \(L^2\) 空间的完备性。
- **控制收敛**：若 \(X_n\to X\) 几乎处处且 \(|X_n|\le Y\)、\(EY<\infty\)，则 \(E|X_n-X|\to0\)，从而 \(EX_n\to EX\)。若只知依概率收敛而仍有同一个可积上界，也可得 \(L^1\) 收敛。
- **强大数定律**：若 \(X_i\) 独立同分布且 \(E|X_1|<\infty\)，则 \(\bar X_n=\frac1n\sum_{i=1}^nX_i\xrightarrow{a.s.}EX_1\)。
- **中心极限定理**：若 \(X_i\) 独立同分布，\(EX_i=\mu\)、\(0<D(X_i)=\sigma^2<\infty\)，则 \(\dfrac{\sum_{i=1}^nX_i-n\mu}{\sigma\sqrt n}\xrightarrow d N(0,1)\)。
## 1\.8 条件期望的定义与计算

- **定义**：\(X\in L^1\) 时，\(E(X\mid Y)=g(Y)\) 是 \(\sigma(Y)\)\-可测的随机变量，且对每个 \(B\in\sigma(Y)\)，\(\int_Bg(Y)\,dP=\int_BX\,dP\)。等价地，对每个有界 Borel 函数 \(h\)，\(E[g(Y)h(Y)]=E[Xh(Y)]\)。这样的 \(g(Y)\) 几乎处处唯一。
- **离散型计算**：若 \(P(Y=y)>0\)，\(E(X\mid Y=y)=\sum_xxP(X=x\mid Y=y)\)；令 \(g(y)\) 为右式，再代入 \(Y\)。
- **连续型计算**：在 \(f_Y(y)>0\) 的点，\(g(y)=\int_{\mathbb R}x f_{X\mid Y}(x\mid y)\,dx=\dfrac{\int x f_{X,Y}(x,y)\,dx}{f_Y(y)}\)。\(f_Y(y)=0\) 处的 \(g(y)\) 可任意定义而不改变条件期望。
- **二元正态**：若 \((X,Y)\) 联合正态，\(EX=\mu_X\)、\(EY=\mu_Y\)、标准差 \(\sigma_X,\sigma_Y>0\)、相关系数 \(\rho\)，则 \(E(X\mid Y)=\mu_X+\rho\dfrac{\sigma_X}{\sigma_Y}(Y-\mu_Y)\)。
## 1\.9 条件期望的基本性质

设 \(X,Z\in L^1\)，\(a,b\) 为常数；下式涉及乘积时默认其可积。

- **全期望**：\(E[E(X\mid Y)]=EX\)；**线性性**：\(E(aX+bZ\mid Y)=aE(X\mid Y)+bE(Z\mid Y)\)。
- **独立性**：若 \(X\) 与 \(Y\) 独立，则 \(E(X\mid Y)=EX\)。
- **已知量提出**：若 \(H=h(Y)\) 为 \(\sigma(Y)\)\-可测且 \(HX\in L^1\)，则 \(E(HX\mid Y)=H E(X\mid Y)\)（右式需可积；有界 \(H\) 足够）。特别地，\(E(h(Y)\mid Y)=h(Y)\)。
- **正交性**：\(E[(X-E(X\mid Y))h(Y)]=0\)，对所有使乘积可积的有界可测 \(h\) 成立；若 \(X\in L^2\)，可取任意 \(h(Y)\in L^2\)。
- **几乎处处唯一性**：两个满足可测性与积分刻画的版本仅可能在零概率集合上不同；“给定 \(Y=y\)”的函数值不必在每个 \(y\) 唯一。
## 1\.10 条件期望的 \(L^2\) 解释与条件方差

- 若 \(X\in L^2\)，则 \(m(Y)=E(X\mid Y)\) 是所有平方可积 \(h(Y)\) 中使 \(E[(X-h(Y))^2]\) 最小的预测量。**残差正交**：\(E[(X-m(Y))h(Y)]=0\)。
- **平方误差分解**：\(E[(X-h(Y))^2]=E[(X-m(Y))^2]+E[(m(Y)-h(Y))^2]\)；最小值为 \(E[D(X\mid Y)]\)。
- **条件方差**：\(D(X\mid Y)=E[(X-E(X\mid Y))^2\mid Y]=E(X^2\mid Y)-[E(X\mid Y)]^2\ge0\)。
- **全方差公式**：\(D(X)=E[D(X\mid Y)]+D(E(X\mid Y))\)，即总波动 = 平均剩余波动 \+ 条件均值的波动。
## 1\.11 多变量条件期望与 Tower Property

- 记 \(\boldsymbol Y=(Y_1,\ldots,Y_n)\)。\(E(X\mid Y_1,\ldots,Y_n)=E(X\mid\sigma(\boldsymbol Y))=g(\boldsymbol Y)\)；对任意有界可测 \(h\)，\(E[g(\boldsymbol Y)h(\boldsymbol Y)]=E[Xh(\boldsymbol Y)]\)。1\.9 的全期望、线性性、独立性、已知量提出与正交性可将 \(Y\) 换成 \(\boldsymbol Y\) 使用。
- **Tower Property / 重期望**：若 \(\mathcal G\subseteq\mathcal H\subseteq\mathcal F\)，则 \(E[E(X\mid\mathcal H)\mid\mathcal G]=E(X\mid\mathcal G)\)。因此
$$E[X\mid Y]=E[E(X\mid Y,Z)\mid Y],$$

$$E[X\mid Y_1,\ldots,Y_m]=E[E(X\mid Y_1,\ldots,Y_n)\mid Y_1,\ldots,Y_m],\qquad m\le n.$$

- 若先条件化于较少信息、再条件化于较多信息，则 \(E[E(X\mid\mathcal G)\mid\mathcal H]=E(X\mid\mathcal G)\)（\(\mathcal G\subseteq\mathcal H\)）；已知的随机变量不会因补充信息而改变。
## 1\.12 关于 \(\sigma\)\-代数的条件期望

- 对 \(\mathcal G\subseteq\mathcal F\)、\(X\in L^1\)，\(Z=E(X\mid\mathcal G)\) 当且仅当：① \(Z\) 为 \(\mathcal G\)\-可测；② 对所有 \(A\in\mathcal G\)，\(\int_AZ\,dP=\int_AX\,dP\)。等价地，\(E(ZH)=E(XH)\) 对所有有界 \(\mathcal G\)\-可测 \(H\) 成立。\(Z\) 几乎处处唯一。
- 令 \(\mathcal F_n=\sigma(Y_1,\ldots,Y_n)\)，则 \(E(X\mid\mathcal F_n)=E(X\mid Y_1,\ldots,Y_n)\)；\(\mathcal F_n\subseteq\mathcal F_{n+1}\) 表示观察信息递增。
- **速用规则**：\(E(aX+bZ\mid\mathcal G)=aE(X\mid\mathcal G)+bE(Z\mid\mathcal G)\)；若 \(X\) 与 \(\mathcal G\) 独立，则 \(E(X\mid\mathcal G)=EX\)；若 \(H\) 为 \(\mathcal G\)\-可测、乘积可积，则 \(E(HX\mid\mathcal G)=H E(X\mid\mathcal G)\)；\(E[(X-E(X\mid\mathcal G))H]=0\)（有界 \(H\)，或 \(L^2\) 框架下 \(H\in L^2\)）。
---

**来源与定位**：

- 《第一章 预备知识 概率论精要》：PDF 第 4–10 页（概率空间、事件域、条件概率、独立性）；第 11–16 页（随机变量、分布、多维分布、顺序统计量）；第 17–22 页（数字特征、特征函数）。
- 《2\_预备知识\_概率论精要》：PDF 第 3–14 页（收敛与极限定理）；第 15–26 页（条件期望、性质和条件方差）；第 27–37 页（多变量与 \(\sigma\)\-代数条件期望）。
**使用提醒**：上列 Geometric 取值从 \(1\) 起、Gamma 使用 rate \(\beta\)；教材若采用“失败次数”或 scale 参数化，公式需相应改写。全文将讲义中的重复投影片合并，并对几乎处处、矩存在、条件密度分母非零等前提作了显式标注。
